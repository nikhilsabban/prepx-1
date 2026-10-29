import { Interview } from "../models/Interview";
import { Message } from "../models/Message";

const CORE_TECHNICAL_TAXONOMY = [
  // Languages & Core
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Golang", "Rust", "PHP", "Ruby", "Swift", "Kotlin",
  // Web Frameworks & Libraries
  "React", "Next.js", "Vue", "Angular", "Node.js", "Express", "NestJS", "Django", "FastAPI", "Spring Boot", "Flask",
  // Databases & Caching
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite", "DynamoDB", "Elasticsearch", "Cassandra", "Memcached",
  // Database Concepts
  "aggregation", "indexing", "B-Tree", "normalization", "ACID", "sharding", "replication", "foreign key",
  // Cloud & DevOps
  "Docker", "Kubernetes", "AWS", "EKS", "EC2", "S3", "GCP", "Azure", "Terraform", "CI/CD", "GitHub Actions", "Jenkins",
  // Architecture & APIs
  "REST API", "GraphQL", "microservices", "WebSocket", "gRPC", "OAuth", "JWT", "monolith", "serverless",
  // CS Fundamentals & Algorithms
  "DSA", "OOP", "DBMS", "recursion", "binary search", "dynamic programming", "time complexity", "concurrency", "deadlock",
  // AI & Data
  "machine learning", "embeddings", "transformers", "neural networks", "gradient descent", "fine-tuning",
  // Tools & Security
  "Git", "GitHub", "Linux", "Nginx", "Jest", "Pytest", "Postman", "CORS", "SSL", "TLS", "RSA-256", "AES"
];

/**
 * Extracts a focused, context-aware list of technical keyterms for Deepgram Nova-3.
 * Prioritizes the active interview's tech stack, current question, and candidate role.
 */
export async function getDynamicInterviewKeyterms(interviewId?: string): Promise<string[]> {
  const termsSet = new Set<string>();

  if (interviewId) {
    try {
      // 1. Fetch interview metadata (role, github project info, dependencies)
      const interview = await Interview.findById(interviewId)
        .select("githubMetadata targetRole")
        .lean();

      if (interview) {
        const gh: any = interview.githubMetadata || {};
        
        // Add target role keywords
        if (gh.targetRole) {
          gh.targetRole.split(/\s+/).forEach((w: string) => {
            if (w.length > 2) termsSet.add(w);
          });
        }

        // Add explicit repository languages
        if (Array.isArray(gh.languages)) {
          gh.languages.forEach((lang: string) => {
            if (typeof lang === "string" && lang.trim()) termsSet.add(lang.trim());
          });
        }

        // Add key package dependencies (e.g. mongoose, express, redux)
        if (Array.isArray(gh.keyDependencies)) {
          gh.keyDependencies.slice(0, 15).forEach((dep: string) => {
            if (typeof dep === "string" && dep.trim()) {
              const cleanDep = dep.replace(/^@[\w-]+\//, "").trim();
              if (cleanDep.length > 2) termsSet.add(cleanDep);
            }
          });
        }

        // Add repository name
        if (gh.repoName && typeof gh.repoName === "string" && gh.repoName.length > 2) {
          termsSet.add(gh.repoName);
        }
      }

      // 2. Fetch the most recent interview question
      const lastAssistantMsg = await Message.findOne({
        interviewId,
        type: "Assistant",
      })
        .sort({ createdAt: -1 })
        .select("message")
        .lean();

      if (lastAssistantMsg?.message) {
        const qText = lastAssistantMsg.message;
        // Extract capitalized words, tech terms, and acronyms from question
        const words = qText.match(/\b([A-Z][a-zA-Z0-9.+#-]+|[a-z]+-[a-z]+|\d+)\b/g) || [];
        for (const w of words) {
          if (w.length > 1 && !["The", "What", "How", "Why", "Could", "You", "When", "Please", "Describe", "Explain", "Can"].includes(w)) {
            termsSet.add(w);
          }
        }
      }
    } catch (err) {
      console.warn("[Keyterms Service] Non-blocking metadata extraction note:", err);
    }
  }

  // 3. Supplement with standard technical taxonomy terms to guarantee high accuracy
  for (const term of CORE_TECHNICAL_TAXONOMY) {
    if (termsSet.size >= 80) break;
    termsSet.add(term);
  }

  return Array.from(termsSet).slice(0, 80);
}
