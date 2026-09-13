import api from "../../../services/api";

export async function uploadResumeApi(file: File) {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await api.post("/api/v1/resume-analysis/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function analyzeResumeApi(payload: {
  resumeId: string;
  jobDescriptionText?: string;
  jobTitle?: string;
  companyName?: string;
}) {
  const response = await api.post("/api/v1/resume-analysis/analyze", payload);
  return response.data;
}

export async function fetchAnalysisHistoryApi(page = 1, limit = 10) {
  const response = await api.get(`/api/v1/resume-analysis/history?page=${page}&limit=${limit}`);
  return response.data;
}

export async function deleteAnalysisApi(analysisId: string) {
  const response = await api.delete(`/api/v1/resume-analysis/${analysisId}`);
  return response.data;
}

export async function generateJobDescriptionApi(payload: {
  jobTitle?: string;
  companyName?: string;
  resumeText?: string;
}) {
  const response = await api.post("/api/v1/resume-analysis/generate-jd", payload);
  return response.data;
}
