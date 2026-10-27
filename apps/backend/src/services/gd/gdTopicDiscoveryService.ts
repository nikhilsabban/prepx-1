import { XMLParser } from "fast-xml-parser";
import { gdGroqService } from "./gdGroqService";
import type { IGDTopicMetadata } from "../../models/GroupDiscussion";

export interface RawFeedArticle {
  headline: string;
  description: string;
  canonicalUrl: string;
  publisher: string;
  publishedAt: Date;
  category: string;
}

export interface DiscoveredTopic extends IGDTopicMetadata {
  id: string;
}

// Approved RSS/Atom feed source list with categories and publisher metadata
const DEFAULT_APPROVED_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    publisher: "BBC News",
    defaultCategory: "AI and Technology",
  },
  {
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    publisher: "BBC News",
    defaultCategory: "Current Affairs",
  },
  {
    url: "https://techcrunch.com/feed/",
    publisher: "TechCrunch",
    defaultCategory: "AI and Technology",
  },
  {
    url: "https://www.technologyreview.com/feed/",
    publisher: "MIT Technology Review",
    defaultCategory: "AI and Technology",
  },
  {
    url: "https://www.wired.com/feed/rss",
    publisher: "Wired",
    defaultCategory: "Cybersecurity and Privacy",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    publisher: "Ars Technica",
    defaultCategory: "Business and Economy",
  },
  {
    url: "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms",
    publisher: "Times of India",
    defaultCategory: "Education and Employment",
  },
];

// Bundled high-yield, curated placement discussion topics for guaranteed resilient fallback
const BUNDLED_STATIC_TOPICS: DiscoveredTopic[] = [
  {
    id: "static-1",
    question: "Should AI literacy and prompt engineering become compulsory curriculum in undergraduate degrees?",
    originalTitle: "Higher Education Institutions Accelerate Integration of Generative AI into Coursework",
    description: "Universities worldwide are debating whether to mandate artificial intelligence fluency as a foundational graduation requirement alongside mathematics and writing.",
    sourceUrl: "https://www.weforum.org/agenda/2024/01/ai-in-higher-education-curriculum/",
    publisher: "World Economic Forum",
    publishedAt: new Date("2025-01-15T00:00:00Z"),
    category: "Education and Employment",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
  {
    id: "static-2",
    question: "Will the widespread adoption of AI code assistants reduce entry-level software engineering jobs or elevate them?",
    originalTitle: "Software Industry Adapts to Automated Code Generation Tools",
    description: "Tech hiring patterns reveal shifting demands from syntax-level programming toward system architecture, prompt engineering, and code verification skills.",
    sourceUrl: "https://spectrum.ieee.org/ai-software-engineering-jobs",
    publisher: "IEEE Spectrum",
    publishedAt: new Date("2025-01-20T00:00:00Z"),
    category: "AI and Technology",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
  {
    id: "static-3",
    question: "Should governments implement strict regulations on autonomous AI agents in financial markets and critical infrastructure?",
    originalTitle: "Global Regulators Propose Guardrails for Autonomous Enterprise AI Agents",
    description: "Policy frameworks in major economies are addressing risks associated with automated algorithmic trading and autonomous infrastructure agents operating without direct human supervision.",
    sourceUrl: "https://www.reuters.com/technology/ai-governance-regulations-2025/",
    publisher: "Reuters",
    publishedAt: new Date("2025-01-22T00:00:00Z"),
    category: "Governance and Policy",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
  {
    id: "static-4",
    question: "Can rapid data-center expansion for AI workloads coexist with national carbon neutrality and clean energy goals?",
    originalTitle: "Rising Power Demand from AI Computing Hubs Challenges Green Energy Targets",
    description: "Hyperscale cloud providers are securing nuclear, geothermal, and solar capacity as data center power consumption surges globally.",
    sourceUrl: "https://www.iea.org/reports/electricity-2024-analysis-and-forecast-to-2026",
    publisher: "International Energy Agency",
    publishedAt: new Date("2025-01-18T00:00:00Z"),
    category: "Environment and Sustainability",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
  {
    id: "static-5",
    question: "Is remote work beneficial or detrimental to long-term career mentorship and junior employee development in corporate placement environments?",
    originalTitle: "Corporate Leaders Re-evaluate Hybrid Work Policies and Junior Mentorship",
    description: "Surveys indicate contrasting outcomes regarding remote productivity gains versus in-person informal learning, team cohesion, and peer mentorship for new graduates.",
    sourceUrl: "https://hbr.org/2024/09/hybrid-work-and-mentorship-dynamics",
    publisher: "Harvard Business Review",
    publishedAt: new Date("2025-01-10T00:00:00Z"),
    category: "Business and Economy",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
  {
    id: "static-6",
    question: "How should social media platforms balance free expression against synthetic deepfake content detection and mitigation during election cycles?",
    originalTitle: "Combating Generative Synthetic Media and Deepfakes in Public Discourse",
    description: "Researchers and tech firms are deploying cryptographic watermarking and provenance standards to verify authentic media content across digital ecosystems.",
    sourceUrl: "https://www.technologyreview.com/2024/11/ai-deepfake-detection-standards/",
    publisher: "MIT Technology Review",
    publishedAt: new Date("2025-01-12T00:00:00Z"),
    category: "Cybersecurity and Privacy",
    sourceMode: "static-fallback",
    isAiGenerated: false,
  },
];

class GDTopicDiscoveryService {
  private cachedTopics: DiscoveredTopic[] = [];
  private lastFetchTime = 0;
  private readonly maxAgeDays: number;
  private readonly refreshMinutes: number;
  private readonly fetchTimeoutMs: number;
  private readonly maxItemsPerFeed: number;
  private readonly cacheTtlMs: number;
  private isFetching = false;

  constructor() {
    this.refreshMinutes = parseInt(process.env.GD_TOPIC_REFRESH_MINUTES || "30", 10);
    this.maxAgeDays = parseInt(process.env.GD_TOPIC_MAX_AGE_DAYS || "7", 10);
    this.fetchTimeoutMs = parseInt(process.env.GD_TOPIC_FETCH_TIMEOUT_MS || "8000", 10);
    this.maxItemsPerFeed = parseInt(process.env.GD_TOPIC_MAX_ITEMS_PER_FEED || "50", 10);
    this.cacheTtlMs = parseInt(process.env.GD_TOPIC_CACHE_TTL_MINUTES || "30", 10) * 60 * 1000;
  }

  /**
   * SSRF & Protocol Safety Check:
   * Validates that the URL uses HTTPS and does not point to internal/private IP ranges or localhost.
   */
  private isSafeUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return false;
      }

      const hostname = parsed.hostname.toLowerCase();

      // Prohibited loopback, link-local, private, and internal addresses
      const blockedHosts = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "169.254.169.254", // Cloud metadata service
        "instance-data",
        "metadata.google.internal",
      ];

      if (blockedHosts.includes(hostname)) {
        return false;
      }

      // Check for private IPv4 patterns (10.x.x.x, 192.168.x.x, 172.16-31.x.x, 127.x.x.x)
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const first = parseInt(match[1]!, 10);
        const second = parseInt(match[2]!, 10);

        if (first === 10) return false;
        if (first === 127) return false;
        if (first === 169 && second === 254) return false;
        if (first === 192 && second === 168) return false;
        if (first === 172 && second >= 16 && second <= 31) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleans HTML markup, unescapes entities, and trims text.
   */
  private sanitizeText(raw: any): string {
    if (!raw) return "";
    let str = "";
    if (typeof raw === "string") {
      str = raw;
    } else if (typeof raw === "object") {
      str = raw["#text"] || raw.value || raw.title || raw.text || "";
    } else {
      str = String(raw);
    }
    return str
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Infers category based on keywords in headline and description.
   */
  private inferCategory(title: string, desc: string, defaultCat: string): string {
    const text = `${title} ${desc}`.toLowerCase();

    if (text.includes("ai") || text.includes("artificial intelligence") || text.includes("machine learning") || text.includes("robot") || text.includes("chip") || text.includes("software")) {
      return "AI and Technology";
    }
    if (text.includes("cyber") || text.includes("hack") || text.includes("privacy") || text.includes("security") || text.includes("data breach")) {
      return "Cybersecurity and Privacy";
    }
    if (text.includes("college") || text.includes("student") || text.includes("curriculum") || text.includes("university") || text.includes("degree") || text.includes("education")) {
      return "Education and Employment";
    }
    if (text.includes("job") || text.includes("layoff") || text.includes("hiring") || text.includes("workplace") || text.includes("salary") || text.includes("career")) {
      return "Education and Employment";
    }
    if (text.includes("economy") || text.includes("market") || text.includes("inflation") || text.includes("stock") || text.includes("bank") || text.includes("trade") || text.includes("startup")) {
      return "Business and Economy";
    }
    if (text.includes("climate") || text.includes("carbon") || text.includes("energy") || text.includes("renewable") || text.includes("environment") || text.includes("emission")) {
      return "Environment and Sustainability";
    }
    if (text.includes("law") || text.includes("policy") || text.includes("govern") || text.includes("court") || text.includes("regulation") || text.includes("election")) {
      return "Governance and Policy";
    }

    return defaultCat || "Current Affairs";
  }

  /**
   * Fetches and parses a single RSS or Atom feed with timeout and size limits.
   */
  private async fetchFeed(
    feedUrl: string,
    publisherName: string,
    defaultCategory: string
  ): Promise<RawFeedArticle[]> {
    if (!this.isSafeUrl(feedUrl)) {
      console.warn(`[GD Topic Service] Prohibited feed URL: ${feedUrl}`);
      return [];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PrepX-AI-Placement-Bot/1.0 (TopicDiscoveryEngine)",
          Accept: "application/rss+xml, application/atom+xml, text/xml, application/xml",
        },
      });

      if (!response.ok) {
        console.warn(`[GD Topic Service] HTTP ${response.status} from ${feedUrl}`);
        return [];
      }

      const xmlText = await response.text();
      clearTimeout(timer);

      // Check max response size (limit ~2MB)
      if (xmlText.length > 2 * 1024 * 1024) {
        console.warn(`[GD Topic Service] Feed response exceeded size threshold: ${feedUrl}`);
        return [];
      }

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        textNodeName: "#text",
      });

      const parsedObj = parser.parse(xmlText);
      const articles: RawFeedArticle[] = [];

      // RSS 2.0 structure: rss.channel.item
      if (parsedObj?.rss?.channel?.item) {
        const items = Array.isArray(parsedObj.rss.channel.item)
          ? parsedObj.rss.channel.item
          : [parsedObj.rss.channel.item];

        const channelTitle =
          this.sanitizeText(parsedObj.rss.channel.title) || publisherName;

        for (const item of items.slice(0, this.maxItemsPerFeed)) {
          const headline = this.sanitizeText(item.title || "");
          const description = this.sanitizeText(
            item.description || item["content:encoded"] || item.summary || ""
          );
          const canonicalUrl = item.link || item.guid || "";
          const pubDateStr = item.pubDate || item.date || "";
          const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date();

          if (headline && canonicalUrl) {
            articles.push({
              headline,
              description: description.slice(0, 400),
              canonicalUrl,
              publisher: channelTitle,
              publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
              category: this.inferCategory(headline, description, defaultCategory),
            });
          }
        }
      }
      // Atom structure: feed.entry
      else if (parsedObj?.feed?.entry) {
        const entries = Array.isArray(parsedObj.feed.entry)
          ? parsedObj.feed.entry
          : [parsedObj.feed.entry];

        const feedTitle =
          this.sanitizeText(parsedObj.feed.title) || publisherName;

        for (const entry of entries.slice(0, this.maxItemsPerFeed)) {
          const headline = this.sanitizeText(entry.title || "");
          const description = this.sanitizeText(
            entry.summary || entry.content || ""
          );
          let canonicalUrl = "";
          if (typeof entry.link === "string") {
            canonicalUrl = entry.link;
          } else if (entry.link?.["@_href"]) {
            canonicalUrl = entry.link["@_href"];
          }
          const pubDateStr = entry.published || entry.updated || "";
          const publishedAt = pubDateStr ? new Date(pubDateStr) : new Date();

          if (headline && canonicalUrl) {
            articles.push({
              headline,
              description: description.slice(0, 400),
              canonicalUrl,
              publisher: feedTitle,
              publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
              category: this.inferCategory(headline, description, defaultCategory),
            });
          }
        }
      }

      return articles;
    } catch (err: any) {
      console.warn(`[GD Topic Service] Error fetching feed ${feedUrl}:`, err?.message || err);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Deterministic template transformation when Groq is unavailable.
   * Grounded in article headline, framing it into a neutral discussion debate.
   */
  public transformWithTemplate(headline: string, category: string): string {
    const clean = headline.replace(/[?.!]+$/, "").trim();

    if (clean.toLowerCase().startsWith("should") || clean.toLowerCase().startsWith("is ") || clean.toLowerCase().startsWith("can ") || clean.toLowerCase().startsWith("will ")) {
      return `${clean}?`;
    }

    const templates = [
      `Should modern organizations and policymakers adapt rapidly to "${clean}"?`,
      `How does "${clean}" influence future industry opportunities and ethical responsibilities?`,
      `Is the trend towards "${clean}" a net positive or a disruption that requires stricter regulation?`,
      `In the context of ${category}, how should candidates and companies address "${clean}"?`,
    ];

    // Select deterministic template based on headline length hash
    const index = Math.abs(clean.length + category.length) % templates.length;
    return templates[index]!;
  }

  /**
   * Transforms an article headline into a neutral, placement-style discussion question using Groq.
   * If Groq is unavailable, gracefully falls back to deterministic template.
   */
  public async transformToDiscussionTopic(
    article: RawFeedArticle
  ): Promise<{ question: string; isAiGenerated: boolean }> {
    const groqClient = gdGroqService.getClient();

    if (!groqClient) {
      return {
        question: this.transformWithTemplate(article.headline, article.category),
        isAiGenerated: false,
      };
    }

    try {
      const prompt = `You are a placement committee director formulating a balanced, provocative, placement-grade Group Discussion (GD) question for college engineering and MBA graduates based on this recent news article.

Article Headline: "${article.headline}"
Short Summary: "${article.description}"
Category: "${article.category}"

REQUIREMENTS:
1. Formulate ONE neutral, open-ended discussion question (10-25 words) that invites balanced debate with valid points on both sides.
2. Ground the question strictly in the article's theme. Do NOT hallucinate unsupported facts.
3. Do NOT present the question as a direct quotation.
4. Output JSON strictly matching: {"question": "string"}

JSON Output:`;

      const result = await gdGroqService.chatCompletionJson<{ question: string }>(
        [
          { role: "system", content: "You formulate concise, neutral Group Discussion topics for campus placements. Output JSON only." },
          { role: "user", content: prompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 150,
          timeoutMs: 8000,
          retries: 1,
        }
      );

      if (result?.question && result.question.trim().endsWith("?")) {
        return {
          question: result.question.trim(),
          isAiGenerated: true,
        };
      }
    } catch (err: any) {
      console.warn("[GD Topic Service] Groq topic transformation fallback:", err?.message || err);
    }

    return {
      question: this.transformWithTemplate(article.headline, article.category),
      isAiGenerated: false,
    };
  }

  /**
   * Refreshes the pool of web-discovered topics from approved RSS/Atom feeds.
   */
  public async refreshTopicPool(force = false): Promise<DiscoveredTopic[]> {
    const now = Date.now();
    const cacheAge = now - this.lastFetchTime;

    if (!force && this.cachedTopics.length > 0 && cacheAge < this.cacheTtlMs) {
      return this.cachedTopics;
    }

    if (this.isFetching) {
      return this.cachedTopics.length > 0 ? this.cachedTopics : BUNDLED_STATIC_TOPICS;
    }

    this.isFetching = true;

    try {
      // Configured or approved feeds
      const customFeedEnv = process.env.GD_TOPIC_RSS_FEEDS;
      let feedList = DEFAULT_APPROVED_FEEDS;

      if (customFeedEnv && customFeedEnv.trim()) {
        const urls = customFeedEnv.split(",").map((u) => u.trim()).filter(Boolean);
        if (urls.length > 0) {
          feedList = urls.map((u) => ({
            url: u,
            publisher: new URL(u).hostname.replace("www.", ""),
            defaultCategory: "Current Affairs",
          }));
        }
      }

      const allArticles: RawFeedArticle[] = [];
      const fetchPromises = feedList.map((f) =>
        this.fetchFeed(f.url, f.publisher, f.defaultCategory)
      );

      const feedResults = await Promise.allSettled(fetchPromises);
      for (const res of feedResults) {
        if (res.status === "fulfilled") {
          allArticles.push(...res.value);
        }
      }

      // Freshness filter: articles published within maxAgeDays
      const maxAgeMs = this.maxAgeDays * 24 * 60 * 60 * 1000;
      const freshArticles = allArticles.filter((a) => {
        const age = now - a.publishedAt.getTime();
        return age >= 0 && age <= maxAgeMs;
      });

      // Deduplication using normalized title
      const seenTitles = new Set<string>();
      const seenUrls = new Set<string>();
      const deduplicated: RawFeedArticle[] = [];

      for (const article of freshArticles) {
        const normTitle = article.headline
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .trim();

        if (!seenTitles.has(normTitle) && !seenUrls.has(article.canonicalUrl)) {
          seenTitles.add(normTitle);
          seenUrls.add(article.canonicalUrl);
          deduplicated.push(article);
        }
      }

      // Publisher and Category Diversity balancing (max 4 per publisher, max 5 per category)
      const publisherCount: Record<string, number> = {};
      const categoryCount: Record<string, number> = {};
      const balanced: RawFeedArticle[] = [];

      for (const item of deduplicated) {
        const pub = item.publisher;
        const cat = item.category;

        publisherCount[pub] = (publisherCount[pub] || 0) + 1;
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        if (publisherCount[pub]! <= 4 && categoryCount[cat]! <= 5) {
          balanced.push(item);
        }
      }

      // Transform top candidates into GD topics
      const transformedList: DiscoveredTopic[] = [];

      for (let i = 0; i < Math.min(balanced.length, 25); i++) {
        const article = balanced[i]!;
        // Quick deterministic transformation for caching pool
        const templateQuestion = this.transformWithTemplate(
          article.headline,
          article.category
        );

        transformedList.push({
          id: `web-${Date.now()}-${i}`,
          question: templateQuestion,
          originalTitle: article.headline,
          description: article.description,
          sourceUrl: article.canonicalUrl,
          publisher: article.publisher,
          publishedAt: article.publishedAt,
          category: article.category,
          sourceMode: "rss",
          isAiGenerated: false,
        });
      }

      if (transformedList.length > 0) {
        this.cachedTopics = transformedList;
        this.lastFetchTime = Date.now();
        console.log(`[GD Topic Service] Discovered ${transformedList.length} fresh web topics from RSS feeds.`);
      } else {
        console.warn("[GD Topic Service] No fresh web topics extracted. Using bundled static fallbacks.");
      }
    } catch (err: any) {
      console.error("[GD Topic Service] Error during topic discovery:", err?.message || err);
    } finally {
      this.isFetching = false;
    }

    return this.cachedTopics.length > 0 ? this.cachedTopics : BUNDLED_STATIC_TOPICS;
  }

  /**
   * Selects a random topic balancing freshness, diversity, and student history.
   * Optionally enhances with Groq for a tailored discussion prompt.
   */
  public async getRandomTopic(options: {
    category?: string;
    excludeTopicIds?: string[];
    excludeQuestions?: string[];
  } = {}): Promise<DiscoveredTopic> {
    // 1. Ensure topics are loaded
    let pool = await this.refreshTopicPool();

    // 2. Filter by category if requested
    if (options.category && options.category !== "All") {
      const filtered = pool.filter(
        (t) => t.category.toLowerCase() === options.category?.toLowerCase()
      );
      if (filtered.length > 0) {
        pool = filtered;
      }
    }

    // 3. Exclude recently seen topics for this student
    const excludeIds = new Set(options.excludeTopicIds || []);
    const excludeTexts = new Set(
      (options.excludeQuestions || []).map((q) => q.toLowerCase().trim())
    );

    const eligible = pool.filter(
      (t) => !excludeIds.has(t.id) && !excludeTexts.has(t.question.toLowerCase().trim())
    );

    const candidatePool = eligible.length > 0 ? eligible : pool;

    // 4. Random selection
    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    const selected = candidatePool[randomIndex] || BUNDLED_STATIC_TOPICS[0]!;

    // 5. If from web and Groq is active, attempt high-quality transformation
    if (selected.sourceMode === "rss" && !selected.isAiGenerated) {
      try {
        const transformed = await this.transformToDiscussionTopic({
          headline: selected.originalTitle,
          description: selected.description,
          canonicalUrl: selected.sourceUrl,
          publisher: selected.publisher,
          publishedAt: selected.publishedAt,
          category: selected.category,
        });

        return {
          ...selected,
          question: transformed.question,
          isAiGenerated: transformed.isAiGenerated,
          sourceMode: "rss",
        };
      } catch {
        return selected;
      }
    }

    return selected;
  }

  /**
   * Returns list of available topic categories.
   */
  public getCategories(): string[] {
    return [
      "All",
      "AI and Technology",
      "Education and Employment",
      "Business and Economy",
      "Environment and Sustainability",
      "Governance and Policy",
      "Cybersecurity and Privacy",
      "Current Affairs",
    ];
  }

  /**
   * Returns bundled static fallback topics.
   */
  public getStaticFallbackTopics(): DiscoveredTopic[] {
    return BUNDLED_STATIC_TOPICS;
  }
}

export const gdTopicDiscoveryService = new GDTopicDiscoveryService();
