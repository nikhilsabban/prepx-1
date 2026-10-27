import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  uploadResumeFile,
  uploadAndParseResume,
  analyzeResume,
  getAnalysisHistory,
  deleteAnalysis,
  generateJobDescriptionEndpoint,
} from "../controllers/resumeAnalysisController";

const router = Router();

router.post(
  "/upload",
  protect as any,
  (req, res, next) => {
    uploadResumeFile.single("resume")(req, res, (err: any) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: err.message || "Resume upload failed. Use a PDF or DOCX under 10MB.",
        });
        return;
      }
      next();
    });
  },
  uploadAndParseResume as any
);
router.post("/analyze", protect as any, analyzeResume as any);
router.post("/generate-jd", protect as any, generateJobDescriptionEndpoint as any);
router.get("/history", protect as any, getAnalysisHistory as any);
router.delete("/:analysisId", protect as any, deleteAnalysis as any);

export default router;
