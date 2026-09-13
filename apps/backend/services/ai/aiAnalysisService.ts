import { Groq } from "groq-sdk";

export interface AIAnalysisRequest {
  resumeText: string;
  jobDescriptionText?: string;
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
 * AI Provider service utilizing Groq LLM to evaluate resume quality and JD fit.
 */
export async function analyzeResumeWithAI(
  req: AIAnalysisRequest
): Promise<AIAnalysisResponse> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  // Fallback default response if no GROQ API key is present
  if (!groqApiKey) {
    return getFallbackAIResponse(req);
  }

  const groq = new Groq({ apiKey: groqApiKey });

  const hasJd = req.jobDescriptionText && req.jobDescriptionText.trim().length > 0;

  const systemPrompt = hasJd
    ? `You are a Senior Technical Recruiter & ATS Auditor.
Your task is to analyze candidate resumes strictly against a specific TARGET JOB DESCRIPTION and return a JSON evaluation.
Extract exact matching keywords/skills present in both the resume and the target job description, as well as missing critical keywords/skills required by the job description but omitted from the resume.

Return ONLY a single valid json object with the following schema:
{
  "semanticMatchScore": <number 0-100 based on alignment with target job>,
  "matchedKeywords": ["<exact keyword 1>", "<exact keyword 2>"],
  "missingKeywords": ["<required job keyword omitted from resume 1>", "<required job keyword omitted 2>"],
  "matchedSkills": ["<matched skill 1>", "<matched skill 2>"],
  "missingSkills": ["<required skill missing from candidate resume 1>", "<missing skill 2>"],
  "strengths": ["<specific candidate strength aligned with role>", "<strength 2>"],
  "weaknesses": ["<gap relative to job description>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<Actionable recommendation to tailor resume for this job>",
      "reason": "<Why ATS/Recruiters need this for this specific role>"
    }
  ],
  "sectionFeedback": {
    "summary": "<Feedback for summary alignment>",
    "skills": "<Feedback for skills section>",
    "experience": "<Feedback for experience>",
    "projects": "<Feedback for projects>",
    "education": "<Feedback for education>"
  }
}`
    : `You are a Senior Technical Recruiter & General Resume Quality Auditor.
Your task is to audit candidate resumes for overall quality, technical breadth, section organization, and industry standards (No specific Job Description provided).
In "matchedKeywords" and "matchedSkills", list all candidate skills/technologies detected in their resume.
In "missingKeywords" and "missingSkills", leave empty [] as there is no specific job posting to compare against.

Return ONLY a single valid json object with the following schema:
{
  "semanticMatchScore": <number 0-100 overall resume quality score>,
  "matchedKeywords": ["<detected technology/skill 1>", "<detected skill 2>"],
  "missingKeywords": [],
  "matchedSkills": ["<detected skill 1>", "<detected skill 2>"],
  "missingSkills": [],
  "strengths": ["<standout resume strength>", "<strength 2>"],
  "weaknesses": ["<area for improvement>", "<weakness 2>"],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "category": "<Category Name>",
      "suggestion": "<General resume optimization suggestion>",
      "reason": "<Explanation>"
    }
  ],
  "sectionFeedback": {
    "summary": "<General feedback for summary>",
    "skills": "<General feedback for skills>",
    "experience": "<General feedback for experience>",
    "projects": "<General feedback for projects>",
    "education": "<General feedback for education>"
  }
}`;

  const userPrompt = hasJd
    ? `<candidate_resume>
${req.resumeText.slice(0, 4000)}
</candidate_resume>

<target_job_description>
${req.jobDescriptionText?.slice(0, 3000)}
</target_job_description>`
    : `<candidate_resume>
${req.resumeText.slice(0, 4000)}
</candidate_resume>`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response received.");

    const parsed = JSON.parse(content);

    return {
      semanticMatchScore: typeof parsed.semanticMatchScore === "number" ? parsed.semanticMatchScore : 78,
      matchedKeywords: Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords : undefined,
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : undefined,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : undefined,
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : undefined,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Strong core technical background"],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Could add more quantifiable metrics"],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      sectionFeedback: parsed.sectionFeedback || {
        summary: "Good clear summary",
        skills: "Well structured skill set",
        experience: "Highlight measurable business outcomes",
        projects: "Include live demo or repository links",
        education: "Clear academic details",
      },
    };
  } catch (err: any) {
    console.error("AI Analysis error:", err);
    return getFallbackAIResponse(req);
  }
}

function getFallbackAIResponse(req: AIAnalysisRequest): AIAnalysisResponse {
  const text = req.resumeText || "";
  const skillsCount = req.structuredData?.skills?.length || 0;
  const wordCount = text.split(/\s+/).length;

  const dynamicStrengths: string[] = [];
  const dynamicWeaknesses: string[] = [];

  if (skillsCount > 5) {
    dynamicStrengths.push(`Extracted ${skillsCount} technical skills (${req.structuredData.skills.slice(0, 4).join(", ")})`);
  } else {
    dynamicWeaknesses.push("Technical skills section could be expanded with more modern frameworks & tools.");
  }

  if (wordCount > 300) {
    dynamicStrengths.push(`Comprehensive resume length (${wordCount} words) covering past projects & experience`);
  } else if (wordCount > 50) {
    dynamicWeaknesses.push(`Resume content is relatively concise (${wordCount} words). Consider adding details to project descriptions.`);
  }

  if (req.jobDescriptionText && req.jobDescriptionText.trim().length > 0) {
    dynamicStrengths.push("Job description target provided for tailored ATS alignment.");
  } else {
    dynamicWeaknesses.push("No specific Job Description provided. Analysis was performed against general industry standards.");
  }

  return {
    semanticMatchScore: Math.min(95, Math.max(50, 65 + (skillsCount * 3))),
    strengths: dynamicStrengths.length > 0 ? dynamicStrengths : [
      "Solid technical background",
      "Clear contact information and section structure",
    ],
    weaknesses: dynamicWeaknesses.length > 0 ? dynamicWeaknesses : [
      "Bullet points could include more quantified metrics (e.g., % performance increase)",
    ],
    recommendations: [
      {
        priority: "HIGH",
        category: "Experience & Achievements",
        suggestion: "Add measurable results (metrics, numbers, or percentages) to your project bullet points.",
        reason: "Recruiters and ATS systems score bullet points higher when backed by evidence of impact.",
      },
      {
        priority: "MEDIUM",
        category: "Keywords",
        suggestion: "Incorporate missing technical keywords aligned with your target position.",
        reason: "Aligning terminology directly with the job description improves keyword match score.",
      },
    ],
    sectionFeedback: {
      summary: "Ensure your summary directly highlights your primary technical specialization.",
      skills: `Extracted skills: ${req.structuredData?.skills?.join(", ") || "None detected"}. Grouping skills into categories improves readability.`,
      experience: "Use strong action verbs like Developed, Implemented, Optimized, and Engineered.",
      projects: "Mention tech stack explicitly alongside what was built and the problem solved.",
      education: "Ensure degree and graduation timeline are clearly stated.",
    },
  };
}
