import type { Response } from "express";
import multer from "multer";
import { Resume } from "../models/Resume";
import { JobDescription } from "../models/JobDescription";
import { ResumeAnalysis } from "../models/ResumeAnalysis";
import { extractTextFromBuffer, parseStructuredResume } from "../services/resume/resumeParserService";
import { calculateATSScore } from "../services/analysis/atsScoringService";
import { analyzeResumeWithAI } from "../services/ai/aiAnalysisService";
import type { AuthRequest } from "../middleware/authMiddleware";

// Multer storage for Resume files
const storage = multer.memoryStorage();
export const uploadResumeFile = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("officedocument") ||
      file.mimetype.includes("docx") ||
      file.originalname.match(/\.(pdf|docx|txt)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are supported"));
    }
  },
});

/**
 * POST /api/v1/resume-analysis/upload
 * Upload & Parse Resume file
 */
export async function uploadAndParseResume(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "Please select a resume file (PDF or DOCX)" });
      return;
    }

    const extractedText = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    console.log(`[ResumeParser] File: ${req.file.originalname}, Extracted Text Length: ${extractedText.length} characters`);
    if (extractedText.length > 0) {
      console.log(`[ResumeParser] Text Preview: "${extractedText.slice(0, 150)}..."`);
    } else {
      console.warn(`[ResumeParser] WARNING: No text extracted from file ${req.file.originalname}. PDF may be scanned/image-only.`);
      throw new Error("Could not extract readable text from this PDF. If this is a scanned image/photo PDF, please use a text-based PDF or DOCX file.");
    }

    const { structuredData } = parseStructuredResume(extractedText);

    const resume = await Resume.create({
      userId: req.user._id,
      originalFileName: req.file.originalname,
      fileType: req.file.mimetype || "application/octet-stream",
      fileSize: req.file.size,
      extractedText,
      structuredData,
    });

    res.status(201).json({
      success: true,
      message: "Resume uploaded and parsed successfully",
      data: {
        resumeId: resume._id,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        extractedText: resume.extractedText,
        structuredData: resume.structuredData,
        createdAt: resume.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to parse uploaded resume",
    });
  }
}

/**
 * POST /api/v1/resume-analysis/analyze
 * Run ATS scoring & AI evaluation for a uploaded resume against a job description
 */
export async function analyzeResume(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { resumeId, jobDescriptionText, jobTitle, companyName } = req.body;

    if (!resumeId) {
      res.status(400).json({ success: false, message: "resumeId is required" });
      return;
    }

    const resume = await Resume.findOne({ _id: resumeId, userId: req.user._id });
    if (!resume) {
      res.status(404).json({ success: false, message: "Resume not found" });
      return;
    }

    // Optionally save Job Description
    let jobDoc = null;
    if (jobDescriptionText && jobDescriptionText.trim().length > 0) {
      jobDoc = await JobDescription.create({
        userId: req.user._id,
        title: jobTitle || "Target Role",
        company: companyName || "",
        description: jobDescriptionText.trim(),
      });
    }

    // Run AI Analysis
    const aiResult = await analyzeResumeWithAI({
      resumeText: resume.extractedText,
      jobDescriptionText: jobDescriptionText || "",
      structuredData: resume.structuredData,
    });

    // Run Deterministic ATS Scoring Model
    const atsResult = calculateATSScore({
      extractedText: resume.extractedText,
      structuredData: resume.structuredData,
      jobDescriptionText: jobDescriptionText || "",
      aiSemanticScore: aiResult.semanticMatchScore,
    });

    // Save Analysis to DB (merging AI semantic extraction + deterministic ATS model)
    const matchedKeywords = aiResult.matchedKeywords && aiResult.matchedKeywords.length > 0 ? aiResult.matchedKeywords : atsResult.matchedKeywords;
    const missingKeywords = aiResult.missingKeywords && aiResult.missingKeywords.length > 0 ? aiResult.missingKeywords : atsResult.missingKeywords;
    const matchedSkills = aiResult.matchedSkills && aiResult.matchedSkills.length > 0 ? aiResult.matchedSkills : atsResult.matchedSkills;
    const missingSkills = aiResult.missingSkills && aiResult.missingSkills.length > 0 ? aiResult.missingSkills : atsResult.missingSkills;

    const analysis = await ResumeAnalysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      jobDescriptionId: jobDoc ? jobDoc._id : undefined,
      atsScore: atsResult.atsScore,
      jobMatchScore: atsResult.jobMatchScore,
      scoreBreakdown: atsResult.categories,
      matchedKeywords,
      missingKeywords,
      matchedSkills,
      missingSkills,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      recommendations: aiResult.recommendations,
      sectionFeedback: aiResult.sectionFeedback,
      formattingAnalysis: {
        riskLevel: atsResult.formattingIssues.length > 0 ? "MEDIUM" : "LOW",
        issues: atsResult.formattingIssues,
      },
    });

    res.json({
      success: true,
      message: "Resume analyzed successfully",
      data: {
        analysisId: analysis._id,
        atsScore: analysis.atsScore,
        jobMatchScore: analysis.jobMatchScore,
        scoreBreakdown: analysis.scoreBreakdown,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        matchedSkills: analysis.matchedSkills,
        missingSkills: analysis.missingSkills,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        recommendations: analysis.recommendations,
        sectionFeedback: analysis.sectionFeedback,
        formattingAnalysis: analysis.formattingAnalysis,
        resume: {
          id: resume._id,
          fileName: resume.originalFileName,
          structuredData: resume.structuredData,
        },
        jobDescription: jobDoc
          ? {
              id: jobDoc._id,
              title: jobDoc.title,
              company: jobDoc.company,
            }
          : null,
        createdAt: analysis.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Resume analysis error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error running resume analysis",
    });
  }
}

/**
 * GET /api/v1/resume-analysis/history
 * Fetch user's past resume analyses with pagination
 */
export async function getAnalysisHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      ResumeAnalysis.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("resumeId", "originalFileName fileSize extractedText structuredData")
        .populate("jobDescriptionId", "title company description"),
      ResumeAnalysis.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Fetch analysis history error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch analysis history",
    });
  }
}

/**
 * DELETE /api/v1/resume-analysis/:analysisId
 * Delete a saved analysis record
 */
export async function deleteAnalysis(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { analysisId } = req.params;
    const deleted = await ResumeAnalysis.findOneAndDelete({
      _id: analysisId,
      userId: req.user._id,
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: "Analysis record not found" });
      return;
    }

    res.json({
      success: true,
      message: "Analysis record deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete analysis error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete analysis record",
    });
  }
}

/**
 * POST /api/v1/resume-analysis/generate-jd
 * Use Groq AI to generate a realistic target Job Description and suggestions based on job title, company, or resume
 */
export async function generateJobDescriptionEndpoint(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { jobTitle, companyName, resumeText } = req.body;

    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
      res.status(400).json({
        success: false,
        message: "GROQ_API_KEY environment variable is not configured.",
      });
      return;
    }

    const { Groq } = await import("groq-sdk");
    const groq = new Groq({ apiKey: groqApiKey });

    const systemPrompt = `You are an AI Tech Recruiter and Job Specifications Specialist.
Your task is to generate a detailed, realistic job description and recommended alternative job titles for a given Job Title and Company Name.

Return ONLY a single valid json object strictly matching this schema:
{
  "recommendedRoles": ["<Role suggestion 1>", "<Role suggestion 2>", "<Role suggestion 3>"],
  "recommendedCompanies": ["<Company 1>", "<Company 2>", "<Company 3>"],
  "generatedJobDescription": "<Full detailed job description text including Responsibilities, Required Tech Stack, Requirements, and Desired Qualifications for this role>"
}`;

    const userPrompt = `Job Title: ${jobTitle || "Software Engineer"}
Company Name: ${companyName || "Top Tech Company"}
${resumeText ? `Candidate Resume Context: ${resumeText.slice(0, 1000)}` : ""}`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty AI response received from Groq");

    const parsed = JSON.parse(content);

    res.json({
      success: true,
      data: {
        recommendedRoles: Array.isArray(parsed.recommendedRoles) ? parsed.recommendedRoles : [],
        recommendedCompanies: Array.isArray(parsed.recommendedCompanies) ? parsed.recommendedCompanies : [],
        generatedJobDescription: parsed.generatedJobDescription || "",
      },
    });
  } catch (error: any) {
    console.error("Generate JD error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI job description",
    });
  }
}
