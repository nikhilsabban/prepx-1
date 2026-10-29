import mammoth from "mammoth";
import zlib from "zlib";

export class ScannedPdfError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "This PDF appears to be a scanned image or non-selectable graphical document. ATS systems and our analyzer require selectable, text-based resumes. Please export or save your resume as a standard text-based PDF (e.g., from Google Docs, Word, or Canva 'PDF Standard') or upload a DOCX file."
    );
    this.name = "ScannedPdfError";
  }
}

export interface ParsedResumeData {
  extractedText: string;
  structuredData: {
    personal: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
    };
    summary?: string;
    skills: string[];
    education: Array<{
      institution?: string;
      degree?: string;
      fieldOfStudy?: string;
      year?: string;
    }>;
    experience: Array<{
      company?: string;
      role?: string;
      duration?: string;
      bulletPoints?: string[];
    }>;
    projects: Array<{
      title?: string;
      technologies?: string[];
      description?: string;
    }>;
    certifications: string[];
    achievements: string[];
    languages: string[];
  };
}

/**
 * Normalizes extracted text: removes control characters and page numbers, preserves line breaks and symbols.
 */
export function sanitizeExtractedText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/^-- \d+ of \d+ --\s*$/gm, "") // Strip pdf-parse page counters
    .replace(/\r\n|\r/g, "\n")
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ \n/g, "\n")
    .replace(/\n /g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Fallback stream extractor for PDFs where pdf-parse encounters unusual stream packaging.
 */
function extractTextFromPdfStreamFallback(buffer: Buffer): string {
  try {
    const binary = buffer.toString("binary");
    const extractedLines: string[] = [];

    const decodePdfString = (str: string): string => {
      return str
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, " ")
        .replace(/\\b/g, "")
        .replace(/\\f/g, "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .trim();
    };

    const extractFromStream = (streamText: string) => {
      const opRegex = /(?:\[([^\]]+)\]\s*TJ|\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f]{2,})>\s*(?:Tj|'|"))/g;
      let m: RegExpExecArray | null;
      const currentLine: string[] = [];

      while ((m = opRegex.exec(streamText)) !== null) {
        if (m[1] !== undefined) {
          // Token array
          const tokenRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
          let tm: RegExpExecArray | null;
          let subText = "";
          while ((tm = tokenRegex.exec(m[1])) !== null) {
            subText += decodePdfString(tm[1]) + " ";
          }
          if (subText.trim()) currentLine.push(subText.trim());
        } else if (m[2] !== undefined) {
          const t = decodePdfString(m[2]);
          if (t) currentLine.push(t);
        } else if (m[3] !== undefined) {
          const hex = m[3];
          let str = "";
          for (let i = 0; i < hex.length; i += 2) {
            const code = parseInt(hex.substr(i, 2), 16);
            if (code >= 32 && code <= 126) str += String.fromCharCode(code);
          }
          if (str.trim()) currentLine.push(str.trim());
        }
      }

      if (currentLine.length > 0) {
        extractedLines.push(currentLine.join(" "));
      }
    };

    const streamRegex = /stream\r?\n?([\s\S]*?)(?:[\r\n\s]*|~>)endstream/g;
    let sMatch: RegExpExecArray | null;

    while ((sMatch = streamRegex.exec(binary)) !== null) {
      let rawData = sMatch[1];
      const streamBuf = Buffer.from(rawData, "binary");
      try {
        const decompressed = zlib.inflateSync(streamBuf).toString("binary");
        extractFromStream(decompressed);
      } catch {
        try {
          const decompressed = zlib.inflateRawSync(streamBuf).toString("binary");
          extractFromStream(decompressed);
        } catch {
          extractFromStream(rawData);
        }
      }
    }

    return sanitizeExtractedText(extractedLines.join("\n"));
  } catch (err) {
    console.warn("[ResumeParser] Stream fallback error:", err);
    return "";
  }
}

/**
 * Extracts raw text from PDF or DOCX file buffers.
 * Preserves multi-column layout order, table cells, bullet points, and detects scanned documents.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string,
  originalFileName: string
): Promise<string> {
  const isPdf = fileType.includes("pdf") || originalFileName.toLowerCase().endsWith(".pdf");
  const isDocx =
    fileType.includes("officedocument") ||
    fileType.includes("docx") ||
    originalFileName.toLowerCase().endsWith(".docx");

  let rawText = "";

  if (isPdf) {
    let parsedViaPdfParse = false;
    let totalPages = 0;

    try {
      const pdfModule: any = await import("pdf-parse").catch(() => null);

      if (pdfModule && typeof pdfModule.PDFParse === "function") {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const result = await parser.getText();
        totalPages = result?.total || result?.pages?.length || 0;

        if (Array.isArray(result?.pages) && result.pages.length > 0) {
          const pageTexts = result.pages
            .map((p: any) => (p.text || "").replace(/^-- \d+ of \d+ --\s*$/gm, "").trim())
            .filter((t: string) => t.length > 0);

          rawText = pageTexts.join("\n\n");
          if (rawText.trim().length >= 40) {
            parsedViaPdfParse = true;
          }
        } else if (result?.text && result.text.trim().length >= 40) {
          rawText = result.text.replace(/^-- \d+ of \d+ --\s*$/gm, "").trim();
          parsedViaPdfParse = true;
        }

        if (typeof parser.destroy === "function") {
          await parser.destroy().catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn("[ResumeParser] pdf-parse threw error:", err?.message || err);
    }

    // Fallback: Check stream decompression if pdf-parse didn't produce text
    if (!parsedViaPdfParse || rawText.trim().length < 40) {
      const fallbackText = extractTextFromPdfStreamFallback(buffer);
      if (fallbackText && fallbackText.trim().length > rawText.trim().length) {
        rawText = fallbackText;
      }
    }

    // Detect Scanned / Image-only PDF
    const cleaned = sanitizeExtractedText(rawText);
    const alphaCount = (cleaned.match(/[a-zA-Z]/g) || []).length;
    const isImageOnly = (totalPages > 0 && alphaCount < 30) || (buffer.length > 20000 && alphaCount < 25);

    if (isImageOnly) {
      throw new ScannedPdfError();
    }

    return cleaned;
  } else if (isDocx) {
    try {
      // Mammoth convertToMarkdown retains table columns, rows, bullet points and headings
      const mdResult = await mammoth.convertToMarkdown({ buffer });
      let text = mdResult.value || "";

      // Clean markdown table markers while retaining cell boundaries
      text = text
        .replace(/\|---+\|/g, "")
        .replace(/\|/g, "  |  ")
        .replace(/^#+\s*/gm, "");

      if (!text.trim() || text.trim().length < 40) {
        // Fallback to extractRawText
        const rawResult = await mammoth.extractRawText({ buffer });
        text = rawResult.value || text;
      }

      rawText = text;
    } catch (err: any) {
      console.error("[ResumeParser] DOCX parse error:", err);
      throw new Error("Could not extract readable text from DOCX resume.");
    }

    return sanitizeExtractedText(rawText);
  } else {
    // Plain text fallback
    rawText = buffer.toString("utf-8");
    return sanitizeExtractedText(rawText);
  }
}

/**
 * Universal multi-industry skill dictionary.
 * Includes Software Engineering, 3D Art & Animation, Design & UI/UX, Data & AI,
 * Cloud/DevOps, Management, Marketing, Finance, Sales, and Operations.
 */
const MULTI_INDUSTRY_SKILLS = [
  // 3D Animation, VFX, Game Development & Creative Media
  "3D Animation", "Maya", "Autodesk Maya", "Blender", "3ds Max", "Cinema 4D", "Houdini",
  "ZBrush", "Character Animation", "Character Rigging", "Rigging", "Skinning",
  "Keyframing", "Keyframe Animation", "Motion Graphics", "After Effects", "Adobe After Effects",
  "Premiere Pro", "Photoshop", "Illustrator", "Unreal Engine", "Unity", "Substance Painter",
  "Substance Designer", "Texturing", "Lighting", "Shading", "Rendering", "Arnold", "V-Ray",
  "Redshift", "Compositing", "Nuke", "Motion Capture", "MoCap", "Storyboarding", "UV Mapping",
  "Weight Painting", "Facial Animation", "Particle Effects", "VFX",

  // UI/UX & Graphic Design
  "Figma", "Sketch", "Adobe XD", "InDesign", "UI/UX", "User Interface", "User Experience",
  "Wireframing", "Prototyping", "Design Systems", "User Research", "Usability Testing",
  "Information Architecture", "Interaction Design", "Visual Design", "Typography",

  // Programming Languages
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Golang", "Rust",
  "PHP", "Ruby", "Swift", "Kotlin", "R", "Scala", "Dart", "Shell", "Bash", "SQL",

  // Web & Frontend Frameworks
  "React", "React.js", "Next.js", "Vue.js", "Vue", "Angular", "Svelte", "Redux", "Zustand",
  "HTML", "HTML5", "CSS", "CSS3", "Tailwind CSS", "Tailwind", "Bootstrap", "Sass", "SCSS",
  "Material UI", "Vite", "Webpack", "REST API", "GraphQL", "WebSockets",

  // Backend & APIs
  "Node.js", "NodeJS", "Express.js", "Express", "NestJS", "FastAPI", "Django", "Flask",
  "Spring Boot", "Spring", "ASP.NET", ".NET", "gRPC", "Microservices", "System Design",

  // Databases & Caching
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
  "SQLite", "Firebase", "Supabase", "Prisma", "Mongoose",

  // Cloud & DevOps
  "AWS", "Amazon Web Services", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s",
  "CI/CD", "GitHub Actions", "Jenkins", "GitLab CI", "Terraform", "Ansible", "Linux",
  "Nginx", "Serverless", "Git", "GitHub", "GitLab",

  // Data Engineering, AI & Machine Learning
  "Machine Learning", "Deep Learning", "Pandas", "NumPy", "PyTorch", "TensorFlow", "Scikit-learn",
  "NLP", "Natural Language Processing", "Computer Vision", "LLM", "Generative AI", "LangChain",
  "Data Pipelines", "ETL", "Apache Spark", "PySpark", "Airflow", "Snowflake", "BigQuery",
  "Tableau", "Power BI", "Data Warehousing", "Data Modeling", "Databricks", "Kafka",

  // Product, Project & Agile
  "Agile", "Scrum", "Kanban", "Jira", "Confluence", "Product Management", "Project Management",
  "Sprint Planning", "Product Strategy", "Roadmapping", "A/B Testing",

  // Marketing & Sales
  "SEO", "SEM", "Google Analytics", "Content Strategy", "Digital Marketing", "Social Media Marketing",
  "Email Marketing", "CRM", "Salesforce", "HubSpot", "Lead Generation", "Copywriting",

  // Finance, Accounting & Business
  "Financial Modeling", "Excel", "QuickBooks", "GAAP", "Financial Analysis", "Auditing",
  "Tax", "Valuation", "Accounting", "Budgeting", "Forecasting",

  // HR & Operations
  "Recruiting", "Talent Acquisition", "Employee Relations", "Onboarding", "HRIS", "Payroll",

  // Testing & Quality Assurance
  "Jest", "Pytest", "Mocha", "Cypress", "Playwright", "Selenium", "Unit Testing", "Integration Testing"
];

function matchesSkillInText(skill: string, text: string): boolean {
  const escaped = skill.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  const bStart = /^[a-zA-Z0-9_]/.test(skill) ? "(?:^|[^a-zA-Z0-9_])" : "";
  const bEnd = "(?=$|[^a-zA-Z0-9_#+])";
  return new RegExp(bStart + escaped + bEnd, "i").test(text);
}

/**
 * Parses raw resume text into structured fields: Contact, Sections, Skills, Experience, Education.
 */
export function parseStructuredResume(rawText: string): ParsedResumeData {
  const text = sanitizeExtractedText(rawText);

  // 1. Personal details
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{5}[-.\s]?\d{5}|\b\d{10}\b)/);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_.-]+/i);
  const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
  const portfolioMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:com|org|io|dev|me|net|tech|app|artstation\.com)(?:\/[^\s]*)?/i);

  const emailDomain = emailMatch ? emailMatch[0].split("@")[1]?.toLowerCase() : "";
  const portfolioRaw = portfolioMatch ? portfolioMatch[0] : "";
  const isEmailDomain = emailDomain && portfolioRaw.toLowerCase().includes(emailDomain);
  const isValidPortfolio =
    portfolioRaw &&
    !isEmailDomain &&
    !portfolioRaw.toLowerCase().includes("linkedin") &&
    !portfolioRaw.toLowerCase().includes("github");

  // Name extraction: top non-header lines
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headerRegex = /^(resume|curriculum vitae|cv|page \d+|profile|contact|about me|portfolio)$/i;
  let candidateName = "";
  for (const line of lines.slice(0, 6)) {
    if (
      !headerRegex.test(line) &&
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("www.") &&
      !line.includes(".com") &&
      !/\d{5,}/.test(line) &&
      line.length >= 2 &&
      line.length <= 40 &&
      !/^[•\-\*\|]/.test(line)
    ) {
      candidateName = line;
      break;
    }
  }

  // 2. Section segmentation
  const sectionKeywords = [
    { key: "summary", patterns: ["summary", "professional summary", "profile", "objective", "about me", "overview"] },
    { key: "skills", patterns: ["skills", "technical skills", "core competencies", "tools", "technologies", "proficiencies", "areas of expertise", "software skills"] },
    { key: "experience", patterns: ["experience", "work experience", "employment history", "professional experience", "work history", "relevant experience"] },
    { key: "education", patterns: ["education", "academic background", "academics", "qualifications", "educational background"] },
    { key: "projects", patterns: ["projects", "key projects", "personal projects", "portfolio projects", "academic projects"] },
    { key: "certifications", patterns: ["certifications", "certificates", "licenses", "courses"] },
    { key: "achievements", patterns: ["achievements", "awards", "honors", "recognition"] },
    { key: "languages", patterns: ["languages", "spoken languages"] }
  ];

  // Match section headers by line
  const detectedIndices: Array<{ key: string; index: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i]!.toLowerCase().replace(/[:\-_#]/g, "").trim();
    if (lineLower.length < 2 || lineLower.length > 35) continue;

    for (const sec of sectionKeywords) {
      if (sec.patterns.some((p) => lineLower === p || lineLower.startsWith(p + " ") || lineLower.endsWith(" " + p))) {
        const charIdx = text.indexOf(lines[i]!);
        if (charIdx >= 0) {
          detectedIndices.push({ key: sec.key, index: charIdx + lines[i]!.length });
        }
        break;
      }
    }
  }

  // Sort by position
  detectedIndices.sort((a, b) => a.index - b.index);

  const sections: Record<string, string> = {};
  for (let i = 0; i < detectedIndices.length; i++) {
    const cur = detectedIndices[i]!;
    const next = detectedIndices[i + 1];
    const content = text.slice(cur.index, next ? next.index : undefined).trim();
    if (!sections[cur.key]) {
      sections[cur.key] = content;
    }
  }

  // 3. Dynamic Skill Extraction (from Resume's own Skills section + Taxonomy)
  const extractedSkills: string[] = [];

  // 3a. If candidate has a dedicated Skills section, parse direct items
  const IGNORED_SECTION_WORDS = new Set([
    "work experience", "experience", "education", "projects", "certifications", "achievements",
    "summary", "profile", "objective", "languages", "personal information", "contact", "references", "skills"
  ]);

  if (sections["skills"]) {
    const rawSkillSection = sections["skills"];
    // Split by comma, bullets, pipes, tabs, or newlines
    const rawTokens = rawSkillSection
      .split(/[,•\*\n\|;]/)
      .map((s) => s.replace(/^[•\-\*:]+\s*/, "").trim())
      .filter((s) => s.length >= 2 && s.length <= 40 && !s.includes(":") && !/\d{4}/.test(s) && !IGNORED_SECTION_WORDS.has(s.toLowerCase()));

    for (const tok of rawTokens) {
      if (!extractedSkills.some((es) => es.toLowerCase() === tok.toLowerCase())) {
        extractedSkills.push(tok);
      }
    }
  }

  // 3b. Also match against universal multi-industry dictionary
  MULTI_INDUSTRY_SKILLS.forEach((skill) => {
    if (matchesSkillInText(skill, text)) {
      if (!extractedSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
        extractedSkills.push(skill);
      }
    }
  });

  // 4. Parse Work Experience
  const experienceText = sections["experience"] || "";
  const parsedExperience: Array<{ company?: string; role?: string; duration?: string; bulletPoints: string[] }> = [];

  if (experienceText) {
    const expLines = experienceText.split("\n").map((l) => l.trim()).filter(Boolean);
    const dateRegex = /(?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present|current)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4}/i;

    let currentEntry: { company?: string; role?: string; duration?: string; bulletPoints: string[] } | null = null;

    for (const line of expLines) {
      const hasDate = dateRegex.test(line);
      const isBullet = /^[•\-\*]\s*/.test(line);

      if (hasDate && !isBullet) {
        if (currentEntry && (currentEntry.bulletPoints.length > 0 || currentEntry.role)) {
          parsedExperience.push(currentEntry);
        }
        currentEntry = {
          role: line.replace(dateRegex, "").replace(/[|,\-–]/g, "").trim() || "Experience",
          duration: (line.match(dateRegex) || [])[0] || "",
          bulletPoints: [],
        };
      } else if (currentEntry && isBullet) {
        const cleanBullet = line.replace(/^[•\-\*]\s*/, "").trim();
        if (cleanBullet.length > 10) {
          currentEntry.bulletPoints.push(cleanBullet);
        }
      } else if (!currentEntry) {
        currentEntry = {
          role: line,
          bulletPoints: [],
        };
      } else if (isBullet) {
        const cleanBullet = line.replace(/^[•\-\*]\s*/, "").trim();
        if (cleanBullet.length > 10) {
          currentEntry.bulletPoints.push(cleanBullet);
        }
      }
    }

    if (currentEntry && (currentEntry.bulletPoints.length > 0 || currentEntry.role)) {
      parsedExperience.push(currentEntry);
    }
  }

  // 5. Parse Education
  const educationText = sections["education"] || "";
  const parsedEducation: Array<{ institution?: string; degree?: string; fieldOfStudy?: string; year?: string }> = [];

  if (educationText) {
    const eduLines = educationText.split("\n").map((l) => l.trim()).filter(Boolean);
    const degreeKeywords = ["bachelor", "master", "phd", "b.tech", "b.s", "m.s", "m.tech", "b.e", "b.a", "m.a", "mba", "diploma", "associate"];
    const yearRegex = /\b(19|20)\d{2}\b/;

    for (const line of eduLines) {
      const lineLower = line.toLowerCase();
      const hasDegree = degreeKeywords.some((d) => lineLower.includes(d));
      const yearMatch = line.match(yearRegex);

      if (hasDegree || yearMatch || line.length > 10) {
        parsedEducation.push({
          degree: hasDegree ? line.replace(/^[•\-\*]\s*/, "") : undefined,
          institution: !hasDegree ? line.replace(/^[•\-\*]\s*/, "") : undefined,
          year: yearMatch ? yearMatch[0] : undefined,
        });
      }
    }
  }

  // 6. Parse Projects
  const projectsText = sections["projects"] || "";
  const parsedProjects: Array<{ title?: string; description?: string }> = [];
  if (projectsText) {
    const projLines = projectsText
      .split("\n")
      .map((l) => l.trim().replace(/^[•\-\*]\s*/, ""))
      .filter((l) => l.length > 12);

    for (const line of projLines.slice(0, 6)) {
      parsedProjects.push({ description: line });
    }
  }

  return {
    extractedText: text,
    structuredData: {
      personal: {
        name: candidateName,
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        github: githubMatch ? githubMatch[0] : "",
        portfolio: isValidPortfolio ? portfolioRaw : "",
      },
      summary: (sections["summary"] || "").slice(0, 400),
      skills: extractedSkills,
      education: parsedEducation.slice(0, 4),
      experience: parsedExperience.slice(0, 6),
      projects: parsedProjects,
      certifications: sections["certifications"] ? sections["certifications"].split("\n").map((s) => s.trim()).filter((s) => s.length > 5).slice(0, 5) : [],
      achievements: sections["achievements"] ? sections["achievements"].split("\n").map((s) => s.trim()).filter((s) => s.length > 5).slice(0, 5) : [],
      languages: sections["languages"] ? sections["languages"].split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6) : [],
    },
  };
}
