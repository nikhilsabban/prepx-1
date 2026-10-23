import mammoth from "mammoth";
import zlib from "zlib";

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

function decodeAscii85(str: string): Buffer {
  str = str.replace(/<~|~>/g, "").replace(/\s+/g, "");
  const out: number[] = [];
  let tuple = 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (str[i] === "z" && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 33 || c > 117) continue;
    tuple = tuple * 85 + (c - 33);
    count++;
    if (count === 5) {
      out.push((tuple >> 24) & 255, (tuple >> 16) & 255, (tuple >> 8) & 255, tuple & 255);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 0) {
    for (let j = count; j < 5; j++) {
      tuple = tuple * 85 + 84;
    }
    for (let k = 0; k < count - 1; k++) {
      out.push((tuple >> (24 - 8 * k)) & 255);
    }
  }
  return Buffer.from(out);
}

/**
 * Extract raw text from PDF binary using Node.js stream decompression (FlateDecode + ASCII85Decode) and PDF text operators.
 * Accurately decodes compressed streams without returning raw PDF dictionary syntax tokens.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const binary = buffer.toString("binary");
    const extractedWords: string[] = [];

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
        .replace(/[^\x20-\x7E\n]/g, " ")
        .trim();
    };

    const extractFromStream = (streamText: string) => {
      // 1. (Text) Tj or ' or "
      const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")/g;
      let m: RegExpExecArray | null;
      while ((m = tjRegex.exec(streamText)) !== null) {
        const decoded = decodePdfString(m[1] ?? "");
        if (decoded.length > 0) extractedWords.push(decoded);
      }

      // 2. [(T) -10 (e) 15 (xt)] TJ
      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
      while ((m = tjArrayRegex.exec(streamText)) !== null) {
        const inner = m[1];
        const innerStrings = inner.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
        if (innerStrings) {
          const combined = innerStrings
            .map((s) => decodePdfString(s.slice(1, -1)))
            .filter(Boolean)
            .join("");
          if (combined.length > 0) extractedWords.push(combined);
        }
      }

      // 3. Hex strings <48656C6C6F> Tj
      const hexTjRegex = /<([0-9A-Fa-f]{2,})>\s*(?:Tj|'|")/g;
      while ((m = hexTjRegex.exec(streamText)) !== null) {
        const hex = m[1];
        let str = "";
        if (hex.startsWith("FEFF") || hex.startsWith("feff")) {
          for (let i = 4; i < hex.length; i += 4) {
            str += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
          }
        } else {
          for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
          }
        }
        const decoded = decodePdfString(str);
        if (decoded.length > 0) extractedWords.push(decoded);
      }
    };

    // Decompress and extract from all stream ... endstream blocks
    const streamRegex = /stream\r?\n?([\s\S]*?)(?:[\r\n\s]*|~>)endstream/g;
    let sMatch: RegExpExecArray | null;

    while ((sMatch = streamRegex.exec(binary)) !== null) {
      const streamHeader = binary.slice(Math.max(0, sMatch.index - 300), sMatch.index);
      let rawData = sMatch[1];
      if (sMatch[0].includes("~>endstream") && !rawData.endsWith("~>")) {
        rawData += "~>";
      }

      let streamBuf = Buffer.from(rawData, "binary");

      // Check for ASCII85 encoding
      const isAscii85 = streamHeader.includes("ASCII85Decode") || rawData.includes("~>");
      if (isAscii85) {
        try {
          streamBuf = decodeAscii85(rawData);
        } catch {
          // Continue with raw buffer if ascii85 decoding fails
        }
      }

      const isFlate = streamHeader.includes("FlateDecode") || isAscii85;
      let decompressed = "";

      if (isFlate) {
        try {
          decompressed = zlib.inflateSync(streamBuf).toString("binary");
        } catch {
          try {
            decompressed = zlib.inflateRawSync(streamBuf).toString("binary");
          } catch {
            decompressed = streamBuf.toString("binary");
          }
        }
      } else {
        decompressed = streamBuf.toString("binary");
      }

      if (decompressed) {
        extractFromStream(decompressed);
      }
    }

    // Fallback: check uncompressed raw binary if streams yielded little
    if (extractedWords.length < 5) {
      extractFromStream(binary);
    }

    if (extractedWords.length > 0) {
      return extractedWords.join(" ");
    }

    return "";
  } catch (err) {
    console.error("[ResumeParser] Error in fallback extractTextFromPdfBuffer:", err);
    return "";
  }
}

/**
 * Extract raw text from PDF or DOCX file buffers.
 * Supports pdf-parse v2 (class PDFParse), pdf-parse v1, and fallback pure-Node stream decompression.
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

    try {
      // Dynamic import to handle both ESM / CJS module structures
      const pdfModule: any = await import("pdf-parse").catch(() => null);

      if (pdfModule) {
        // 1. pdf-parse v2 support (class PDFParse)
        if (typeof pdfModule.PDFParse === "function") {
          const parser = new pdfModule.PDFParse({ data: buffer });
          const result = await parser.getText();
          if (result?.text && result.text.trim().length > 10) {
            rawText = result.text;
            parsedViaPdfParse = true;
          }
        }

        // 2. pdf-parse v1 support (function export)
        if (!parsedViaPdfParse) {
          const pdfParseFn =
            typeof pdfModule === "function"
              ? pdfModule
              : typeof pdfModule.default === "function"
              ? pdfModule.default
              : null;

          if (pdfParseFn) {
            const result = await pdfParseFn(buffer);
            if (result?.text && result.text.trim().length > 10) {
              rawText = result.text;
              parsedViaPdfParse = true;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[ResumeParser] pdf-parse library failed, falling back to stream extractor:", err);
    }

    if (!parsedViaPdfParse || rawText.trim().length < 40) {
      const fallbackText = extractTextFromPdfBuffer(buffer);
      if (fallbackText && fallbackText.trim().length > rawText.trim().length) {
        rawText = fallbackText;
      }
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
    .replace(/^-- \d+ of \d+ --\s*$/gm, "") // Strip pdf-parse page counters
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parses extracted raw text into structured JSON data
 */
export function parseStructuredResume(rawText: string): ParsedResumeData {
  const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{5}[-.\s]?\d{5}|\b\d{10}\b)/);
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_.-]+/i);
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_.-]+/i);
  const portfolioMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9.-]+\.(?:com|org|io|dev|me|net|tech|app)(?:\/[^\s]*)?/i);
  const emailDomain = emailMatch ? emailMatch[0].split("@")[1]?.toLowerCase() : "";
  const portfolioRaw = portfolioMatch ? portfolioMatch[0] : "";
  const isEmailDomain = emailDomain && portfolioRaw.toLowerCase().includes(emailDomain);
  const isValidPortfolio =
    portfolioRaw &&
    !isEmailDomain &&
    !portfolioRaw.toLowerCase().includes("linkedin") &&
    !portfolioRaw.toLowerCase().includes("github");

  // Extract candidate name from top lines (skip document headers like CV/Resume)
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headerRegex = /^(resume|curriculum vitae|cv|page \d+|profile|contact|about me)$/i;
  let candidateName = "";
  for (const line of lines.slice(0, 5)) {
    if (
      !headerRegex.test(line) &&
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("www.") &&
      !line.includes(".com") &&
      !/\d{5,}/.test(line) &&
      line.length >= 2 &&
      line.length <= 50
    ) {
      candidateName = line;
      break;
    }
  }

  // Comprehensive technical skills dictionary
  const skillKeywords = [
    // Programming Languages
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "C", "Go", "Golang", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "R", "Scala", "Dart", "Shell", "Bash",

    // Databases & Cache
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "SQLite", "Firebase", "Supabase", "Prisma", "Mongoose",

    // Frontend Frameworks & Web
    "React", "Next.js", "Vue.js", "Angular", "Svelte", "Redux", "Zustand", "HTML", "HTML5", "CSS", "CSS3", "Tailwind", "TailwindCSS", "Bootstrap", "Sass", "Material UI", "Vite", "Webpack",

    // Backend Frameworks & APIs
    "Node.js", "NodeJS", "Express", "Express.js", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot", "Spring", "ASP.NET", ".NET", "GraphQL", "REST API", "gRPC",

    // Cloud, DevOps & Infrastructure
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "K8s", "CI/CD", "GitHub Actions", "Jenkins", "GitLab CI", "Terraform", "Ansible", "Linux", "Nginx", "Serverless", "Microservices", "System Design",

    // Data Engineering, Big Data & Analytics
    "ETL", "Data Pipelines", "Power BI", "Tableau", "Apache Spark", "PySpark", "Airflow", "Snowflake", "BigQuery", "Data Warehousing", "Star Schema", "Hadoop", "Kafka", "Data Modeling", "Databricks",

    // Machine Learning & AI
    "Machine Learning", "Deep Learning", "Pandas", "NumPy", "PyTorch", "TensorFlow", "Scikit-learn", "NLP", "Computer Vision", "LLM", "Generative AI", "LangChain", "OpenAI",

    // UI/UX Design & Product
    "Figma", "Adobe XD", "Illustrator", "Photoshop", "Miro", "UI/UX", "Wireframing", "Wireframes", "Prototyping", "Prototypes", "Design Systems", "User Research", "Interaction Design", "Jira",

    // Testing & Quality Assurance
    "Jest", "Pytest", "Mocha", "Cypress", "Playwright", "Selenium", "Unit Testing", "Integration Testing",

    // Tools, Methodologies & Soft Skills
    "Git", "GitHub", "GitLab", "Bitbucket", "OOP", "Agile", "Scrum", "Kanban", "Data Structures", "Algorithms", "Design Patterns", "Communication", "Leadership", "Problem Solving"
  ];

  function matchesSkill(skill: string, text: string): boolean {
    const escaped = skill.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    const bStart = /^[a-zA-Z0-9_]/.test(skill) ? "(?:^|[^a-zA-Z0-9_])" : "";
    const bEnd = "(?=$|[^a-zA-Z0-9_#+])";
    return new RegExp(bStart + escaped + bEnd, "i").test(text);
  }

  const extractedSkills: string[] = [];
  skillKeywords.forEach((skill) => {
    if (matchesSkill(skill, rawText) && !extractedSkills.includes(skill)) {
      extractedSkills.push(skill);
    }
  });

  // Extract detected sections
  const sectionKeywords = ["summary", "experience", "work experience", "education", "projects", "certifications", "skills"];
  const secRegex = new RegExp("(^|\\n)(" + sectionKeywords.join("|") + ")\\b", "gi");
  let sMatch: RegExpExecArray | null;
  const indices: Array<{ header: string; index: number }> = [];
  while ((sMatch = secRegex.exec(rawText)) !== null) {
    indices.push({ header: sMatch[2].toLowerCase(), index: sMatch.index + sMatch[1].length });
  }

  const detectedSections: Record<string, string> = {};
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    const next = indices[i + 1];
    const content = rawText.slice(cur.index, next ? next.index : undefined);
    detectedSections[cur.header] = content.split("\n").slice(1).join("\n").trim();
  }

  const experienceText = detectedSections["experience"] || detectedSections["work experience"] || "";
  const educationText = detectedSections["education"] || "";
  const projectsText = detectedSections["projects"] || "";
  const summaryText = detectedSections["summary"] || "";

  const expBullets = experienceText
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter((l) => l.length > 15);

  const parsedExperience = expBullets.length > 0
    ? [{ company: "", role: "Professional Experience", bulletPoints: expBullets.slice(0, 8) }]
    : [];

  const eduLines = educationText
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter((l) => l.length > 5);

  const parsedEducation = eduLines.length > 0
    ? eduLines.slice(0, 3).map((line) => ({ institution: line }))
    : [];

  const projLines = projectsText
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
    .filter((l) => l.length > 10);

  const parsedProjects = projLines.length > 0
    ? projLines.slice(0, 5).map((line) => ({ description: line }))
    : [];

  return {
    extractedText: rawText,
    structuredData: {
      personal: {
        name: candidateName,
        email: emailMatch ? emailMatch[0] : "",
        phone: phoneMatch ? phoneMatch[0] : "",
        linkedin: linkedinMatch ? linkedinMatch[0] : "",
        github: githubMatch ? githubMatch[0] : "",
        portfolio: isValidPortfolio ? portfolioRaw : "",
      },
      summary: summaryText.slice(0, 300),
      skills: extractedSkills,
      education: parsedEducation,
      experience: parsedExperience,
      projects: parsedProjects,
      certifications: [],
      achievements: [],
      languages: [],
    },
  };
}
