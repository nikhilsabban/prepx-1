export interface ATSScoreInput {
  extractedText: string;
  structuredData: any;
  jobDescriptionText?: string;
  jobTitle?: string;
  aiSemanticScore?: number;
  aiMatchedKeywords?: string[];
  aiMissingKeywords?: string[];
  aiMatchedSkills?: string[];
  aiMissingSkills?: string[];
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

const COMMON_STOP_WORDS = new Set([
  "about", "above", "across", "after", "again", "against", "all", "almost", "alone", "along", "already",
  "also", "although", "always", "among", "and", "another", "any", "anybody", "anyone", "anything",
  "anywhere", "are", "area", "areas", "around", "ask", "asked", "asking", "asks", "away", "back", "backed",
  "backing", "backs", "became", "because", "become", "becomes", "becoming", "been", "before", "began",
  "behind", "being", "beings", "best", "better", "between", "big", "both", "but", "came", "can", "cannot",
  "case", "cases", "certain", "certainly", "clear", "clearly", "come", "could", "did", "differ", "different",
  "differently", "does", "done", "down", "downed", "downing", "downs", "during", "each", "early", "either",
  "end", "ended", "ending", "ends", "enough", "even", "evenly", "ever", "every", "everybody", "everyone",
  "everything", "everywhere", "face", "faces", "fact", "facts", "far", "felt", "few", "fewer", "find",
  "finds", "first", "for", "four", "from", "full", "fully", "further", "furthered", "furthering", "furthers",
  "gave", "general", "generally", "get", "gets", "give", "given", "gives", "good", "goods", "great", "greater",
  "greatest", "group", "grouped", "grouping", "groups", "had", "has", "have", "having", "her", "here",
  "herself", "high", "higher", "highest", "him", "himself", "his", "how", "however", "important", "interest",
  "interested", "interesting", "interests", "into", "its", "itself", "just", "keep", "keeps", "knew", "know",
  "known", "knows", "large", "largely", "last", "later", "latest", "least", "less", "let", "lets", "like",
  "likely", "long", "longer", "longest", "made", "make", "making", "man", "many", "may", "member", "members",
  "men", "might", "more", "most", "mostly", "much", "must", "myself", "name", "needed", "needing", "needs",
  "never", "new", "newer", "newest", "next", "nobody", "non", "noone", "not", "nothing", "now", "nowhere",
  "number", "numbers", "off", "often", "old", "older", "oldest", "once", "one", "only", "open", "opened",
  "opening", "opens", "order", "ordered", "ordering", "orders", "other", "others", "our", "out", "over",
  "part", "parted", "parting", "parts", "per", "place", "places", "point", "pointed", "pointing", "points",
  "possible", "present", "presented", "presenting", "presents", "problem", "problems", "put", "puts",
  "quite", "rather", "really", "right", "room", "rooms", "said", "same", "saw", "say", "says", "second",
  "seconds", "see", "seem", "seemed", "seeming", "seems", "sees", "several", "shall", "she", "should",
  "show", "showed", "showing", "shows", "side", "sides", "since", "small", "smaller", "smallest", "some",
  "somebody", "someone", "something", "somewhere", "state", "states", "still", "such", "sure", "take",
  "taken", "than", "that", "the", "their", "them", "then", "there", "therefore", "these", "they", "thing",
  "things", "think", "thinks", "this", "those", "though", "thought", "thoughts", "three", "through", "thus",
  "time", "times", "today", "together", "too", "took", "toward", "turn", "turned", "turning", "turns", "two",
  "under", "until", "upon", "use", "used", "uses", "very", "want", "wanted", "wanting", "wants", "was",
  "way", "ways", "well", "wells", "went", "were", "what", "when", "where", "whether", "which", "while",
  "who", "whole", "whom", "whose", "why", "will", "with", "within", "without", "work", "worked", "working",
  "works", "would", "year", "years", "yet", "you", "young", "younger", "youngest", "your", "yours",
  "candidate", "responsibilities", "requirements", "qualifications", "preferred", "duties", "role", "job"
]);

/**
 * Transparent, evidence-based ATS Scoring Engine.
 * Accurately measures:
 * - Keyword Match (25%)
 * - Job Alignment (20%)
 * - Skills Match (20%)
 * - Experience Relevance (15%)
 * - Resume Structure (10%)
 * - Formatting Risk (5%)
 * - Contact Information (5%)
 */
export function calculateATSScore(input: ATSScoreInput): ATSScoreResult {
  const {
    extractedText,
    structuredData,
    jobDescriptionText,
    jobTitle,
    aiSemanticScore,
    aiMatchedSkills,
    aiMissingSkills,
    aiMatchedKeywords,
    aiMissingKeywords,
  } = input;

  const textLower = (extractedText || "").toLowerCase();
  const jdLower = (jobDescriptionText || "").toLowerCase();
  const titleLower = (jobTitle || "").toLowerCase();
  const hasTarget = jdLower.trim().length > 0 || titleLower.trim().length > 0;

  // 1. Contact Information Score (5%)
  const personal = structuredData?.personal || {};
  let contactScore = 0;
  if (personal.name && personal.name.length > 2) contactScore += 30;
  if (personal.email && personal.email.includes("@")) contactScore += 35;
  if (personal.phone && personal.phone.length >= 7) contactScore += 20;
  if (personal.linkedin || personal.github || personal.portfolio) contactScore += 15;
  contactScore = Math.min(100, contactScore);

  // 2. Resume Structure Score (10%)
  const standardSections = ["summary", "profile", "objective", "experience", "education", "skills", "projects"];
  let foundSections = 0;
  standardSections.forEach((sec) => {
    if (new RegExp(`\\b${sec}\\b`, "i").test(textLower)) {
      foundSections++;
    }
  });
  const structureScore = Math.min(100, Math.round((foundSections / 5) * 100));

  // 3. Formatting Risk Score (5%)
  const formattingIssues: string[] = [];
  let formattingScore = 100;

  if (extractedText.length < 300) {
    formattingIssues.push("Resume is very brief (less than 300 characters).");
    formattingScore -= 45;
  }
  if (extractedText.length > 15000) {
    formattingIssues.push("Resume is unusually long (>15,000 characters). Aim for 1-2 concise pages.");
    formattingScore -= 15;
  }
  if (/[\u25A0-\u25FF\u2600-\u26FF]/.test(extractedText)) {
    formattingIssues.push("Unusual decorative dingbat symbols detected that some legacy ATS parsers reject.");
    formattingScore -= 10;
  }
  if ((extractedText.match(/\t/g) || []).length > 25) {
    formattingIssues.push("Heavy tab stops or complex multi-column layout detected.");
    formattingScore -= 15;
  }
  formattingScore = Math.max(0, formattingScore);

  // 4. Role-Specific Keyword & Skills Matching
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  let keywordScore = 75;
  let skillsScore = 75;
  let jobAlignmentScore = aiSemanticScore !== undefined ? aiSemanticScore : 75;
  let experienceScore = 75;

  const candidateSkills: string[] = (structuredData?.skills || []).map((s: string) => s.trim());

  if (hasTarget) {
    // Extract genuine domain keywords from JD & Title
    const combinedTargetText = `${titleLower} ${jdLower}`;
    const rawTokens = combinedTargetText.match(/\b[a-z0-9#+.]{2,25}\b/gi) || [];

    const domainTokens = Array.from(
      new Set(
        rawTokens
          .map((t) => t.toLowerCase())
          .filter((t) => t.length >= 3 && !COMMON_STOP_WORDS.has(t) && !/^\d+$/.test(t))
      )
    );

    // If AI provided extracted keywords, prioritize them
    if (Array.isArray(aiMatchedKeywords)) {
      matchedKeywords = aiMatchedKeywords;
    } else {
      matchedKeywords = domainTokens.filter((kw) => textLower.includes(kw)).slice(0, 20);
    }

    if (Array.isArray(aiMissingKeywords)) {
      missingKeywords = aiMissingKeywords;
    } else {
      missingKeywords = domainTokens.filter((kw) => !textLower.includes(kw)).slice(0, 15);
    }

    // Skills match
    if (Array.isArray(aiMatchedSkills) && Array.isArray(aiMissingSkills)) {
      matchedSkills = aiMatchedSkills;
      missingSkills = aiMissingSkills;
      const totalRequired = matchedSkills.length + missingSkills.length;
      if (totalRequired > 0) {
        skillsScore = Math.round((matchedSkills.length / totalRequired) * 100);
      } else {
        skillsScore = candidateSkills.length > 0 ? 50 : 20;
      }
    } else {
      // Deterministic skills check
      matchedSkills = candidateSkills.filter((cs) => combinedTargetText.includes(cs.toLowerCase()));
      const targetRequiredKeywords = domainTokens.slice(0, 15);
      missingSkills = targetRequiredKeywords.filter((tk) => !candidateSkills.some((cs) => cs.toLowerCase() === tk));

      if (targetRequiredKeywords.length > 0) {
        skillsScore = Math.round((matchedSkills.length / Math.max(targetRequiredKeywords.length, 1)) * 100);
      } else {
        skillsScore = candidateSkills.length > 0 ? 60 : 30;
      }
    }

    // Keyword score
    const totalKeywords = matchedKeywords.length + missingKeywords.length;
    if (totalKeywords > 0) {
      keywordScore = Math.round((matchedKeywords.length / totalKeywords) * 100);
    } else {
      keywordScore = 50;
    }

    // Experience Relevance: evaluates role title alignment and impact metrics
    let expPoints = 0;

    // Check if candidate past roles or experience mentions target title words
    const targetTitleTokens = titleLower.split(/\s+/).filter((t) => t.length > 2 && !COMMON_STOP_WORDS.has(t));
    let titleOverlapCount = 0;
    targetTitleTokens.forEach((tok) => {
      if (textLower.includes(tok)) titleOverlapCount++;
    });

    if (targetTitleTokens.length > 0) {
      const titleRatio = titleOverlapCount / targetTitleTokens.length;
      expPoints += Math.round(titleRatio * 45); // up to 45 pts for direct role title overlap
    } else {
      expPoints += 20;
    }

    // Check for quantifiable impact metrics in text (numbers, percentages, scale)
    const hasPercentages = /\b\d{1,3}%\b/.test(extractedText);
    const hasCurrencyOrScale = /\$[\d,]+|\b\d+\s*(?:k|m|million|users|clients|team|engineers|projects)\b/i.test(extractedText);
    const hasActionVerbs = /\b(developed|engineered|designed|led|built|optimized|implemented|increased|reduced|achieved|delivered)\b/i.test(extractedText);

    if (hasPercentages) expPoints += 20;
    if (hasCurrencyOrScale) expPoints += 15;
    if (hasActionVerbs) expPoints += 20;

    // Significant domain mismatch penalty: if zero skills match or AI flags low alignment (<25), experience is in the wrong field
    if (skillsScore === 0 || (aiSemanticScore !== undefined && aiSemanticScore <= 25)) {
      expPoints = Math.min(15, expPoints);
      keywordScore = Math.min(25, keywordScore);
    }

    experienceScore = Math.min(100, Math.max(5, expPoints));

    // Job alignment integrates AI semantic evaluation
    if (aiSemanticScore !== undefined) {
      jobAlignmentScore = aiSemanticScore;
    } else {
      jobAlignmentScore = Math.round(skillsScore * 0.5 + keywordScore * 0.3 + experienceScore * 0.2);
    }
  } else {
    // General audit when no job description is provided
    matchedSkills = candidateSkills;
    missingSkills = [];
    matchedKeywords = candidateSkills.slice(0, 15);
    missingKeywords = [];

    skillsScore = Math.min(100, Math.max(40, candidateSkills.length * 8));
    keywordScore = candidateSkills.length > 5 ? 85 : 65;
    jobAlignmentScore = aiSemanticScore !== undefined ? aiSemanticScore : 75;

    // Check quantifiable metrics
    let expPoints = 50;
    if (/\b\d{1,3}%\b/.test(extractedText)) expPoints += 25;
    if (/\b(developed|engineered|designed|led|built|optimized)\b/i.test(extractedText)) expPoints += 25;
    experienceScore = Math.min(100, expPoints);
  }

  const categories = {
    keywordMatch: Math.min(100, Math.max(0, keywordScore)),
    jobAlignment: Math.min(100, Math.max(0, jobAlignmentScore)),
    skillsMatch: Math.min(100, Math.max(0, skillsScore)),
    experienceRelevance: Math.min(100, Math.max(0, experienceScore)),
    structure: Math.min(100, Math.max(0, structureScore)),
    formatting: Math.min(100, Math.max(0, formattingScore)),
    contactInformation: Math.min(100, Math.max(0, contactScore)),
  };

  // Weighted ATS Score
  const atsScore = Math.round(
    categories.keywordMatch * 0.25 +
    categories.jobAlignment * 0.20 +
    categories.skillsMatch * 0.20 +
    categories.experienceRelevance * 0.15 +
    categories.structure * 0.10 +
    categories.formatting * 0.05 +
    categories.contactInformation * 0.05
  );

  // Job Match Score: focused strictly on role relevance
  const jobMatchScore = hasTarget
    ? Math.round(
        categories.skillsMatch * 0.40 +
        categories.jobAlignment * 0.35 +
        categories.keywordMatch * 0.25
      )
    : categories.jobAlignment;

  return {
    atsScore: Math.min(100, Math.max(0, atsScore)),
    jobMatchScore: Math.min(100, Math.max(0, jobMatchScore)),
    categories,
    matchedKeywords,
    missingKeywords,
    matchedSkills,
    missingSkills,
    formattingIssues,
  };
}
