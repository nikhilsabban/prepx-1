import mammoth from "mammoth";

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
 * Extract raw text from PDF binary using pure Node.js — no native modules.
 * Handles PDF text operators (Tj / TJ) and falls back to printable ASCII extraction.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const raw = buffer.toString("binary");

    // Method 1: Extract parenthesised text operator content  (text)Tj or [(text)]TJ
    const tjPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*T[jJ]/g;
    const words: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = tjPattern.exec(raw)) !== null) {
      const decoded = (m[1] ?? "")
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\(.)/g, "$1") // unescape backslash sequences
        .replace(/[^\x20-\x7E]/g, " ")
        .trim();
      if (decoded.length > 0) words.push(decoded);
    }

    if (words.length > 10) {
      return words.join(" ");
    }

    // Method 2: Extract all printable ASCII tokens >= 3 chars
    const tokenPattern = /[A-Za-z0-9@._+\-/]{3,}/g;
    const tokens = raw.match(tokenPattern) ?? [];
    if (tokens.length > 20) {
      return tokens.join(" ");
    }

    // Method 3: UTF-8 with non-printable stripped
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
  } catch {
    return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
  }
}

/**
 * Extract raw text from PDF or DOCX file buffers.
 * Uses pure-JS extraction for PDFs (no native pdf-parse dependency) and mammoth for DOCX.
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
    // Try dynamic pdf-parse import first (if available in the Vercel environment)
    let parsedViaPdfParse = false;
    try {
      // Dynamic import avoids esbuild/ESM issues with CJS modules
      // @ts-ignore — dynamic require for optional pdf-parse support
      const mod: any = await import("pdf-parse").catch(() => null);
      const pdfParseFn = mod?.default ?? mod;
      if (typeof pdfParseFn === "function") {
        const result = await pdfParseFn(buffer);
        if (result?.text && result.text.trim().length > 10) {
          rawText = result.text;
          parsedViaPdfParse = true;
        }
      }
    } catch {
      // Fall through to pure-JS extraction
    }

    if (!parsedViaPdfParse) {
      rawText = extractTextFromPdfBuffer(buffer);
    }
  } else if (isDocx) {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      rawText = parsed.value;
    } catch (err: any) {
      console.error("DOCX parse error:", err);
      throw new Error("Could not extract text from DOCX resume.");
    }
  } else {
    // Plain text fallback
    rawText = buffer.toString("utf-8");
  }

  return sanitizeExtractedText(rawText);
}

function sanitizeExtractedText(text: string): string {
  return (text || "")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

/**
 * Parses extracted raw text into structured JSON data
 */
export function parseStructuredResume(rawText: string): ParsedResumeData {
  const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\ s]?\d{3}[-.\s]?\d{4}\b/);
  const linkedinMatch = rawText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i);
  const githubMatch = rawText.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i);
  const portfolioMatch = rawText.match(/https?:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/\S*)?/i);

  // Extract Name (first non-empty line usually contains candidate name)
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const candidateName = lines[0] && lines[0].length < 40 ? lines[0] : "";

  // Common technical, data, cloud, and soft skills dictionary for comprehensive extraction
  const skillKeywords = [
    // Languages & Database
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "SQL", "PostgreSQL", "MySQL", "MongoDB",
    "Redis", "Elasticsearch", "HTML", "CSS", "R", "Go", "Rust", "PHP", "Scala",

    // Frameworks & Libraries
    "React", "Node.js", "Express", "Tailwind", "Next.js", "Vue.js", "Angular", "Django", "Flask", "FastAPI",
    "Spring Boot", "ASP.NET", "Pandas", "NumPy", "PyTorch", "TensorFlow", "Scikit-learn", "Redux", "Zustand",

    // Data Engineering & Analytics
    "ETL", "Data Pipelines", "Power BI", "Tableau", "Apache Spark", "Airflow", "Snowflake", "BigQuery",
    "Data Warehousing", "Star Schema", "Hadoop", "Kafka", "Data Modeling", "Databricks",

    // Cloud, DevOps & Tools
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "GitHub", "CI/CD", "GitHub Actions", "Jenkins",
    "Terraform", "Linux", "REST API", "GraphQL", "Microservices", "System Design",

    // Practices & Methodologies
    "OOP", "Object Oriented Programming", "Agile", "Scrum", "Data Structures", "Algorithms",
    "Unit Testing", "Pytest", "Jest", "Design Patterns", "Communication", "Leadership", "Problem Solving"
  ];

  const extractedSkills: string[] = [];
  skillKeywords.forEach((skill) => {
    const regex = new RegExp(`\\b${skill.replace(/\+/g, "\\+")}\\b`, "i");
    if (regex.test(rawText)) {
      extractedSkills.push(skill);
    }
  });

  return {
    extractedText: rawText,
    structuredData: {
      personal: {
        name: candidateName,
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        github: githubMatch ? githubMatch[0] : "",
        portfolio: portfolioMatch && !portfolioMatch[0].includes("linkedin") && !portfolioMatch[0].includes("github") ? portfolioMatch[0] : "",
      },
      skills: extractedSkills,
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
      languages: [],
    },
  };
}
