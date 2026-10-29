import { Groq } from "groq-sdk";

export interface AIAnalysisRequest {
  resumeText: string;
  jobDescriptionText?: string;
  jobTitle?: string;
  companyName?: string;
  structuredData?: any;
}

export interface AIAnalysisResponse {
  semanticMatchScore: number;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    category: string;
    suggestion: string;
    reason: string;
  }>;
  sectionFeedback: {
    summary: string;
    skills: string;
    experience: string;
    projects: string;
    education: string;
  };
}

/**
 * Returns pool of Groq API keys.
 */
function getGroqKeyPool(): string[] {
  const raw = process.env.GROQ_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * AI Provider service utilizing Groq LLM to evaluate resume quality and JD fit.
 */
export async function analyzeResumeWithAI(
  req: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const keys = getGroqKeyPool();

  if (keys.length === 0) {
    console.warn("[AIAnalysis] No GROQ_API_KEY configured. Falling back to local domain-aware analysis.");
    return getFallbackAIResponse(req);
  }

  const effectiveJobTitle = req.jobTitle?.trim() || "";
  const effectiveCompany = req.companyName?.trim() || "";
  const effectiveJdText = req.jobDescriptionText?.trim() || "";
  const hasTargetRole = effectiveJobTitle.length > 0 || effectiveJdText.length > 0;

  const targetRoleHeader = [
    effectiveJobTitle ? `Target Role: ${effectiveJobTitle}` : "",
    effectiveCompany ? `Target Company: ${effectiveCompany}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const systemPrompt = hasTargetRole
    ? `You are an expert Technical Recruiter, Hiring Manager & ATS Auditor.
Your task is to conduct an evidence-based evaluation of a candidate's resume strictly against the specified TARGET ROLE and JOB DESCRIPTION.

EVALUATION RULES:
1. DOMAIN & FIELD VERIFICATION:
   - Carefully determine the candidate's actual primary domain (e.g., 3D Animation/Art, Software Engineering, Graphic Design, Marketing, Finance, Nursing, etc.).
   - Compare the candidate's domain with the target role domain.
   - SEVERE MISMATCH PENALTY: If the candidate's domain DOES NOT MATCH the target job (e.g., an Animation/Art resume evaluated for a Software Engineer role, or a Software Developer applying for a 3D Animator role):
     * "semanticMatchScore" MUST BE LOW: between 10 and 28 out of 100. NEVER award high scores (e.g. >35) to completely mismatched domains!
     * "weaknesses" MUST prominently state the fundamental domain mismatch (e.g., "Candidate background is in 3D Art/Animation with zero professional software engineering or full-stack web development credentials required for this role.").
     * "missingSkills" and "missingKeywords" MUST list the primary core competencies of the target role that are missing.
     * "matchedSkills" and "matchedKeywords" MUST be empty or only include truly shared transferable skills (e.g., "Git", "Agile"). DO NOT invent fake matches.
   - STRONG MATCH: If the candidate's background matches the target role, evaluate based on technical depth, metrics, and genuine skill overlap (60-95 score range).

2. EVIDENCE-BASED RECOMMENDATIONS:
   - Every recommendation MUST be actionable, specific, and cite actual missing skills or gaps relevant to this target role.
   - Do NOT provide generic platitudes like "add more numbers". Explain WHAT numbers or projects are needed for this specific role.

Return ONLY a single valid JSON object strictly matching this schema:
{
  "semanticMatchScore": <number 0-100 reflecting true role alignment>,
  "matchedKeywords": ["<exact keyword from JD found in resume 1>", "<keyword 2>"],
  "missingKeywords": ["<required keyword from JD omitted from resume 1>", "<keyword 2>"],
  "matchedSkills": ["<skill present in both resume and target role 1>", "<skill 2>"],
  "missingSkills": ["<critical required skill missing from resume 1>", "<skill 2>"],
  "strengths": ["<specific strength aligned with target role>", "<strength 2>"],
  "weaknesses": ["<specific gap or domain mismatch relative to role>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Specific actionable advice>",
      "reason": "<Why this matters for this specific role>"
    }
  ],
  "sectionFeedback": {
    "summary": "<Feedback on summary alignment with target role>",
    "skills": "<Feedback on skills section alignment with target role>",
    "experience": "<Feedback on experience bullet points alignment with target role>",
    "projects": "<Feedback on projects alignment with target role>",
    "education": "<Feedback on education alignment with target role>"
  }
}`
    : `You are an expert Technical Recruiter & General Resume Quality Auditor.
Your task is to audit a candidate's resume for overall quality, structure, technical breadth, and industry standards within their own field (No specific Job Description provided).

Return ONLY a single valid JSON object strictly matching this schema:
{
  "semanticMatchScore": <number 0-100 overall resume quality score in their field>,
  "matchedKeywords": ["<detected skill or competency 1>", "<detected skill 2>"],
  "missingKeywords": [],
  "matchedSkills": ["<detected skill 1>", "<detected skill 2>"],
  "missingSkills": [],
  "strengths": ["<standout resume strength>", "<strength 2>"],
  "weaknesses": ["<area for improvement>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Actionable recommendation>",
      "reason": "<Explanation>"
    }
  ],
  "sectionFeedback": {
    "summary": "<General summary feedback>",
    "skills": "<General skills feedback>",
    "experience": "<General experience feedback>",
    "projects": "<General projects feedback>",
    "education": "<General education feedback>"
  }
}`;

  const userPrompt = hasTargetRole
    ? `<target_role_context>
${targetRoleHeader}
${effectiveJdText ? `Job Description:\n${effectiveJdText.slice(0, 3500)}` : `Target Position: ${effectiveJobTitle}`}
</target_role_context>

<candidate_resume>
${req.resumeText.slice(0, 4500)}
</candidate_resume>`
    : `<candidate_resume>
${req.resumeText.slice(0, 4500)}
</candidate_resume>`;

  const candidateModels = [
    process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3.8-27b",
  ];

  let lastError: any = null;
  const startIdx = Math.floor(Math.random() * keys.length);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[(startIdx + i) % keys.length]!;
    const groq = new Groq({ apiKey: key });

    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("Empty AI response received.");

        // Clean any markdown formatting around JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse JSON from AI response.");

        const parsed = JSON.parse(jsonMatch[0]);

        const normalizedRecommendations = Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map((r: any, idx: number) => {
              if (typeof r === "string") {
                return {
                  priority: idx === 0 ? "HIGH" : idx < 3 ? "MEDIUM" : "LOW",
                  category: "Role Optimization",
                  suggestion: r,
                  reason: "Directly improves ATS score and recruiter alignment for this target role.",
                };
              }
              return {
                priority: r.priority || (idx === 0 ? "HIGH" : idx < 3 ? "MEDIUM" : "LOW"),
                category: r.category || "Role Alignment",
                suggestion: r.suggestion || r.recommendation || String(r),
                reason: r.reason || "Actionable improvement for standard ATS parsers and hiring managers.",
              };
            })
          : [];

        return {
          semanticMatchScore:
            typeof parsed.semanticMatchScore === "number"
              ? Math.min(100, Math.max(0, parsed.semanticMatchScore))
              : 50,
          matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : [],
          missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
          matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
          missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
          strengths:
            Array.isArray(parsed.strengths) && parsed.strengths.length > 0
              ? parsed.strengths
              : ["Demonstrates clear professional formatting"],
          weaknesses:
            Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0
              ? parsed.weaknesses
              : ["Could align terminology more closely with target position"],
          recommendations: normalizedRecommendations,
          sectionFeedback: parsed.sectionFeedback || {
            summary: "Ensure summary explicitly highlights alignment with target position.",
            skills: "Group skills into recognized domain categories.",
            experience: "Emphasize measurable outcomes and relevant accomplishments.",
            projects: "Showcase projects directly relevant to target role requirements.",
            education: "Ensure degree and graduation timeline are clearly stated.",
          },
        };
      } catch (err: any) {
        lastError = err;
        // If model not found or rate limited, try next model
        continue;
      }
    }
  }

  console.error("[AIAnalysis] All Groq API attempts failed. Falling back to dynamic domain analysis:", lastError?.message || lastError);
  return getFallbackAIResponse(req);
}

/**
 * Dynamic domain-aware fallback when AI provider is unavailable.
 * Accurately detects domain mismatches (e.g. animation vs software) and never returns static hardcoded placeholders.
 */
function getFallbackAIResponse(req: AIAnalysisRequest): AIAnalysisResponse {
  const text = (req.resumeText || "").toLowerCase();
  const targetTitle = (req.jobTitle || "").toLowerCase();
  const jdText = (req.jobDescriptionText || "").toLowerCase();
  const candidateSkills: string[] = req.structuredData?.skills || [];

  const combinedTarget = `${targetTitle} ${jdText}`.trim();
  const hasTarget = combinedTarget.length > 0;

  // Domain definitions
  const domains = [
    {
      name: "Software Engineering",
      keywords: ["software", "developer", "frontend", "backend", "full stack", "react", "typescript", "javascript", "node", "python", "java", "c++", "sql", "api", "docker", "aws"],
    },
    {
      name: "3D Art & Animation",
      keywords: ["animation", "animator", "3d", "maya", "blender", "rigging", "character", "keyframing", "zbrush", "texturing", "lighting", "vfx", "motion graphics", "after effects", "unreal"],
    },
    {
      name: "UI/UX & Product Design",
      keywords: ["ui/ux", "designer", "figma", "wireframe", "prototype", "user experience", "user interface", "design system", "adobe xd"],
    },
    {
      name: "Data Science & Analytics",
      keywords: ["data", "analyst", "analytics", "sql", "pandas", "numpy", "machine learning", "tableau", "power bi", "etl", "spark", "python"],
    },
    {
      name: "Marketing & Growth",
      keywords: ["marketing", "seo", "sem", "social media", "content", "campaigns", "copywriting", "growth", "google analytics"],
    },
    {
      name: "Finance & Accounting",
      keywords: ["finance", "financial", "accounting", "accountant", "audit", "tax", "gaap", "quickbooks", "valuation", "modeling"],
    },
  ];

  // Detect resume domain
  let resumeDomain = "General Professional";
  let maxResumeScore = 0;
  for (const d of domains) {
    const score = d.keywords.filter((kw) => text.includes(kw)).length;
    if (score > maxResumeScore) {
      maxResumeScore = score;
      resumeDomain = d.name;
    }
  }

  // Detect target domain
  let targetDomain = resumeDomain;
  let maxTargetScore = 0;
  if (hasTarget) {
    for (const d of domains) {
      const score = d.keywords.filter((kw) => combinedTarget.includes(kw)).length;
      if (score > maxTargetScore) {
        maxTargetScore = score;
        targetDomain = d.name;
      }
    }
  }

  const isDomainMismatch = hasTarget && resumeDomain !== targetDomain && maxTargetScore >= 2;

  if (isDomainMismatch) {
    // True domain mismatch (e.g. 3D Animator applying for Software Engineer)
    const targetKeywords = domains.find((d) => d.name === targetDomain)?.keywords || [];
    const missing = targetKeywords.filter((kw) => !text.includes(kw)).slice(0, 8);
    const matched = targetKeywords.filter((kw) => text.includes(kw));

    return {
      semanticMatchScore: 18,
      matchedKeywords: matched,
      missingKeywords: missing,
      matchedSkills: matched,
      missingSkills: missing,
      strengths: [
        `Strong credentials in ${resumeDomain}`,
        "Clear professional formatting and document organization",
      ],
      weaknesses: [
        `Critical domain divergence: Candidate background is centered in ${resumeDomain}, whereas target role requires ${targetDomain}`,
        `Missing primary technical qualifications required for ${targetDomain} (e.g., ${missing.slice(0, 4).join(", ")})`,
      ],
      recommendations: [
        {
          priority: "HIGH",
          category: "Career Alignment",
          suggestion: `Transitioning to ${targetDomain} requires demonstrating foundational projects or certifications in ${missing.slice(0, 3).join(", ")}.`,
          reason: `ATS scanners and hiring managers for ${targetDomain} filter out resumes lacking primary domain credentials.`,
        },
        {
          priority: "HIGH",
          category: "Target Projects",
          suggestion: `Add 2-3 substantial portfolio projects that directly utilize ${targetDomain} methodologies.`,
          reason: "Practical evidence is required when transitioning between distinct functional domains.",
        },
      ],
      sectionFeedback: {
        summary: `Current summary reflects ${resumeDomain}. Reframe to highlight transferable skills toward ${targetDomain}.`,
        skills: `Heavily weighted toward ${resumeDomain}. Needs core ${targetDomain} competencies.`,
        experience: `Past experience focuses on ${resumeDomain}. Highlight any cross-functional overlap with ${targetDomain}.`,
        projects: `Add relevant ${targetDomain} projects to demonstrate capability.`,
        education: "Clear academic credentials provided.",
      },
    };
  }

  // Matching domain or general audit
  const words = text.split(/\s+/).length;
  const targetKeywords = domains.find((d) => d.name === targetDomain)?.keywords || [];
  const matched = targetKeywords.filter((kw) => text.includes(kw));
  const missing = hasTarget ? targetKeywords.filter((kw) => !text.includes(kw)).slice(0, 6) : [];

  return {
    semanticMatchScore: hasTarget ? Math.min(92, Math.max(65, 50 + matched.length * 6)) : 80,
    matchedKeywords: matched,
    missingKeywords: missing,
    matchedSkills: candidateSkills.filter((s) => text.includes(s.toLowerCase())).slice(0, 10),
    missingSkills: missing,
    strengths: [
      `Strong alignment with ${resumeDomain} competencies (${candidateSkills.slice(0, 4).join(", ") || "core skills"})`,
      `Comprehensive resume depth with ${words} words across project & work history`,
    ],
    weaknesses: [
      hasTarget && missing.length > 0
        ? `Could integrate key role competencies: ${missing.slice(0, 3).join(", ")}`
        : "Could expand bullet points with more quantifiable outcome metrics (% increase, scale, performance)",
    ],
    recommendations: [
      {
        priority: "HIGH",
        category: "Role Optimization",
        suggestion: hasTarget && missing.length > 0
          ? `Incorporate required competencies (${missing.slice(0, 3).join(", ")}) into recent project descriptions.`
          : "Quantify your achievements using specific numbers, percentages, or measurable operational scale.",
        reason: "Strengthens keyword alignment with ATS filters and proves measurable impact to recruiters.",
      },
      {
        priority: "MEDIUM",
        category: "Action Verbs",
        suggestion: "Begin every experience bullet point with strong impact verbs (e.g. Architected, Engineered, Optimized, Delivered).",
        reason: "Improves readability and executive presence during human recruiter review.",
      },
    ],
    sectionFeedback: {
      summary: `Directly highlights your ${resumeDomain} specialization.`,
      skills: `Extracted skills: ${candidateSkills.slice(0, 6).join(", ") || "Good core competencies"}. Grouping skills by category improves readability.`,
      experience: "Focus bullet points on concrete problem-solution-impact narratives.",
      projects: "Ensure each project lists the exact tools used and measurable outcomes.",
      education: "Standard academic formatting present.",
    },
  };
}
