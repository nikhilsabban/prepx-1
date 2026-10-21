export interface ATSScoreInput {
  extractedText: string;
  structuredData: any;
  jobDescriptionText?: string;
  aiSemanticScore?: number; // Optional 0-100 score from LLM semantic match
}

export interface ATSScoreResult {
  atsScore: number;
  jobMatchScore: number;
  categories: {
    keywordMatch: number;
    jobAlignment: number;
    skillsMatch: number;
    experienceRelevance: number;
    structure: number;
    formatting: number;
    contactInformation: number;
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  formattingIssues: string[];
}

/**
 * Transparent ATS Scoring Engine using a 7-category weighted mathematical model:
 * - Keyword Match (25%)
 * - Job Alignment (20%)
 * - Skills Match (20%)
 * - Experience Relevance (15%)
 * - Resume Structure (10%)
 * - Formatting Risk (5%)
 * - Contact Information (5%)
 */
export function calculateATSScore(input: ATSScoreInput): ATSScoreResult {
  const { extractedText, structuredData, jobDescriptionText, aiSemanticScore } = input;
  const textLower = extractedText.toLowerCase();
  const jdLower = (jobDescriptionText || "").toLowerCase();

  // 1. Contact Information Score (5%)
  const personal = structuredData?.personal || {};
  let contactScore = 0;
  if (personal.name) contactScore += 30;
  if (personal.email) contactScore += 35;
  if (personal.phone) contactScore += 25;
  if (personal.linkedin || personal.github) contactScore += 10;
  contactScore = Math.min(100, contactScore);

  // 2. Resume Structure Score (10%)
  const requiredSections = [
    "experience", "work", "employment", "education", "degree",
    "skills", "projects", "summary", "objective"
  ];
  let foundSectionsCount = 0;
  requiredSections.forEach((sec) => {
    if (textLower.includes(sec)) foundSectionsCount++;
  });
  const structureScore = Math.min(100, Math.round((foundSectionsCount / 5) * 100));

  // 3. Formatting Risk Score (5%)
  const formattingIssues: string[] = [];
  let formattingScore = 100;

  if (extractedText.length < 200) {
    formattingIssues.push("Resume contains very little readable text.");
    formattingScore -= 40;
  }
  if (/[\u25A0-\u25FF\u2600-\u26FF]/g.test(extractedText)) {
    formattingIssues.push("Unusual bullet icons or decorative symbols detected.");
    formattingScore -= 15;
  }
  if ((extractedText.match(/\t/g) || []).length > 20) {
    formattingIssues.push("Excessive tab characters or potential multi-column formatting detected.");
    formattingScore -= 20;
  }
  formattingScore = Math.max(0, formattingScore);

  // 4. Keyword & Skills Matching (25% & 20%)
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  let keywordScore = 75; // Default score if no JD provided
  let skillsScore = 75;
  let jobAlignmentScore = aiSemanticScore !== undefined ? aiSemanticScore : 75;
  let experienceScore = 80;

  if (jdLower.trim()) {
    // Extract candidate skills & JD keywords
    const resumeSkills: string[] = structuredData?.skills || [];
    
    // Extract terms from JD
    const jdWords = Array.from(new Set(jdLower.match(/\b[a-z0-9.+]{3,}\b/gi) || []));

    const sampleTechTerms = [
      "javascript", "typescript", "react", "node.js", "express", "mongodb", "python",
      "aws", "docker", "sql", "git", "rest api", "graphql", "ci/cd", "microservices",
      "etl", "power bi", "pandas", "numpy", "data pipelines", "star schema"
    ];

    const jdRequiredSkills = sampleTechTerms.filter((term) => jdLower.includes(term));

    matchedSkills = resumeSkills.filter((s) => jdLower.includes(s.toLowerCase()));
    missingSkills = jdRequiredSkills.filter((s) => !resumeSkills.some((rs) => rs.toLowerCase() === s));

    if (jdRequiredSkills.length > 0) {
      skillsScore = Math.round((matchedSkills.length / jdRequiredSkills.length) * 100);
    } else {
      skillsScore = resumeSkills.length > 3 ? 85 : 60;
    }

    // Keyword match against JD
    const jdKeywords = jdWords.filter((w) => w.length > 4).slice(0, 20);
    matchedKeywords = jdKeywords.filter((kw) => textLower.includes(kw));
    missingKeywords = jdKeywords.filter((kw) => !textLower.includes(kw));

    if (jdKeywords.length > 0) {
      keywordScore = Math.round((matchedKeywords.length / jdKeywords.length) * 100);
    }
  } else {
    // When no Job Description is provided, display candidate's extracted skills & keywords as matched
    matchedSkills = structuredData?.skills || [];
    missingSkills = [];
    matchedKeywords = (structuredData?.skills || []).slice(0, 10);
    missingKeywords = [];
  }

  // Calculate Weighted ATS Score
  const categories = {
    keywordMatch: Math.min(100, Math.max(0, keywordScore)),
    jobAlignment: Math.min(100, Math.max(0, jobAlignmentScore)),
    skillsMatch: Math.min(100, Math.max(0, skillsScore)),
    experienceRelevance: Math.min(100, Math.max(0, experienceScore)),
    structure: Math.min(100, Math.max(0, structureScore)),
    formatting: Math.min(100, Math.max(0, formattingScore)),
    contactInformation: Math.min(100, Math.max(0, contactScore)),
  };

  const atsScore = Math.round(
    categories.keywordMatch * 0.25 +
      categories.jobAlignment * 0.20 +
      categories.skillsMatch * 0.20 +
      categories.experienceRelevance * 0.15 +
      categories.structure * 0.10 +
      categories.formatting * 0.05 +
      categories.contactInformation * 0.05
  );

  const jobMatchScore = Math.round(
    categories.keywordMatch * 0.40 +
      categories.skillsMatch * 0.40 +
      categories.jobAlignment * 0.20
  );

  return {
    atsScore,
    jobMatchScore,
    categories,
    matchedKeywords: matchedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 15),
    matchedSkills,
    missingSkills,
    formattingIssues,
  };
}
