import z from "zod";

export const PreInterviewBody = z.object({
  title: z.string().min(1, "Interview title is required"),
  mode: z.enum(["github", "role", "jd"]).optional().default("github"),
  github: z.string().optional(),
  role: z.string().optional(),
  jobDescription: z.string().optional(),
  difficulty: z.enum(["Basic", "Easy", "Medium", "Difficult"]).optional(),
});