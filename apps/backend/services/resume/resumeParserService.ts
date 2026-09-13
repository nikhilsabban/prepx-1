import { createRequire } from "module";
import mammoth from "mammoth";

const require = createRequire(import.meta.url);
const pdfParsePkg = require("pdf-parse");
const PDFParse = pdfParsePkg.PDFParse || pdfParsePkg.default?.PDFParse;

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
 * Extract raw text from PDF or DOCX file buffers
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
    try {
      if (typeof pdfParsePkg === "function") {
        const parsed = await pdfParsePkg(buffer);
        rawText = parsed.text || "";
      } else if (PDFParse) {
        const instance = new PDFParse({ data: buffer });
        const parsed = await instance.getText();
        rawText = typeof parsed === "string" ? parsed : parsed.text || "";
      } else {
        throw new Error("PDF parser class or function not available");
      }
    } catch (err: any) {
      console.error("PDF parse error:", err);
      throw new Error("Could not extract text from PDF resume.");
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
    // Fallback: try plain text
    rawText = buffer.toString("utf-8");
  }

  // Normalize text whitespace
  return rawText
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
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
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
