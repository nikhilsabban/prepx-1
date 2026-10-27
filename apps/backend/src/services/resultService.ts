import { evaluateInterviewWithGroq } from "./groqService";

export async function calculateResult(
  messages: { type: "Assistant" | "User"; message: string; createdAt: Date }[]
): Promise<any> {
  return await evaluateInterviewWithGroq(messages);
}