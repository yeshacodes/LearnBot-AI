import { API_ROUTES, apiFetch } from "../lib/api";
import type { Citation } from "../../types";

export type BackendCitation = Citation & {
  source_id?: string;
  source_name?: string;
  page?: number | null;
};

export type AskAiResult = {
  answerId?: string;
  answer: string;
  citations: BackendCitation[];
};

export async function askAiWithSources(question: string, sourceIds: string[]): Promise<AskAiResult> {
  // TODO: Replace direct frontend-to-API fetches with a dedicated backend client once
  // LearnBot has a production API gateway, request tracing, and model safety middleware.
  const res = await apiFetch(API_ROUTES.chat, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sourceIds }),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = typeof parsed?.detail === "string" ? parsed.detail : text;
    } catch {
      detail = text;
    }
    if (res.status === 400 || res.status === 404) {
      throw new Error(detail || "LearnBot could not find readable context for that source.");
    }
    throw new Error("LearnBot could not answer right now. Please try again in a moment.");
  }

  const response = await res.json();
  return {
    answerId: response.answer_id ? String(response.answer_id) : undefined,
    answer: String(response.answer ?? "I could not produce an answer from the selected sources."),
    citations: Array.isArray(response.citations) ? response.citations : [],
  };
}

export function buildLocalSourceSummary(sourceName: string, concepts: string[]): string {
  // TODO: Move source summarization to the backend so generated summaries can use
  // extracted chunks, model moderation, rate limits, and persistent job status.
  const topicText = concepts.length ? concepts.slice(0, 3).join(", ") : "core ideas";
  return `${sourceName} is ready for study. LearnBot has prepared placeholder concepts around ${topicText} until backend summarization is enabled.`;
}
