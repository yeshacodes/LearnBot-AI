import { supabase } from "./supabase";
import type { Flashcard, FlashcardDeck, QuizDifficulty, QuizQuestion, Source } from "../../types";

export type SourceDebug = {
  source_id: string;
  filename: string;
  status: "processing" | "ready" | "failed";
  extracted_text_length: number;
  chunk_count: number;
  error?: string;
};

export const API_ROUTES = {
  health: "/api/health",
  sources: "/api/sources",
  source: (sourceId: string) => `/api/sources/${sourceId}`,
  sourceUpload: "/api/sources/upload",
  sourceWeb: "/api/sources/web",
  sourceDebug: (sourceId: string) => `/api/sources/${sourceId}/debug`,
  chat: "/api/chat",
  decks: "/api/decks",
  deckCards: (deckId: string) => `/api/decks/${deckId}/cards`,
  deckGenerate: "/api/decks/generate",
  quizGenerate: "/api/quizzes/generate",
  flashcards: "/api/flashcards",
  flashcardGenerate: "/api/flashcards/generate",
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBackendSourceId(id: string): boolean {
  return !id.startsWith("source-") && UUID_PATTERN.test(id);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await supabase.auth.getSession();
  return session.data.session?.access_token ?? null;
}

export function getApiBase(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const baseRaw =
    env.NEXT_PUBLIC_API_BASE_URL ||
    env.VITE_API_BASE ||
    "http://localhost:8000";
  const base = baseRaw.trim();
  return base.replace(/\/$/, "");
}

if (import.meta.env.DEV) {
  const apiBase = getApiBase();
  console.log("API_BASE_URL", apiBase);
  try {
    const apiHost = new URL(apiBase).host;
    if (typeof window !== "undefined" && apiHost === window.location.host) {
      console.warn("API_BASE_URL appears to point at the frontend host. It should point at the Render FastAPI backend root.");
    }
  } catch {
    console.warn("API_BASE_URL is not a valid absolute URL:", apiBase);
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Please sign in again.");
  }

  const headers = new Headers(options.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  const base = getApiBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  try {
    return await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(`Unable to reach the server at ${url}. Check that the backend is running.`);
  }
}

export async function deleteSource(sourceId: string): Promise<{ deleted: boolean; source_id: string }> {
  if (!isBackendSourceId(sourceId)) {
    return { deleted: true, source_id: sourceId };
  }

  const res = await apiFetch(API_ROUTES.source(sourceId), {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function parseSourcesList(json: any): any[] {
  if (Array.isArray(json)) {
    return json;
  }
  if (json && typeof json === "object" && Array.isArray(json.sources)) {
    return json.sources;
  }

  const receivedType = Array.isArray(json) ? "array" : typeof json;
  const receivedKeys = json && typeof json === "object" && !Array.isArray(json)
    ? Object.keys(json).join(", ")
    : "n/a";
  throw new Error(`Unexpected /api/sources response type=${receivedType} keys=[${receivedKeys}]`);
}

export function normalizeSources(rawList: any[]): Source[] {
  return rawList
    .map((s: any): Source => normalizeSource(s))
    .filter((x: Source) => x.id);
}

export function normalizeSource(s: any): Source {
  const chunkCount = Number(s.chunk_count ?? s.chunks_indexed ?? s.chunkCount ?? 0);
  const extractedTextLength = Number(s.extracted_text_length ?? s.extractedTextLength ?? 0);
  const explicitStatus = s.status;
  const status =
    explicitStatus === "processing" || explicitStatus === "ready" || explicitStatus === "failed"
      ? explicitStatus
      : explicitStatus === "error"
        ? "failed"
        : chunkCount > 0
          ? "ready"
          : "processing";

  return {
    id: String(s.id ?? s.source_id ?? s.uuid ?? ""),
    name: String(s.name ?? s.filename ?? "Untitled"),
    type: (s.source_type === "url" || s.source_type === "web" || s.type === "url") ? "url" : "pdf",
    url: s.url ?? s.metadata?.url ?? undefined,
    date: s.created_at
      ? new Date(s.created_at).toLocaleDateString()
      : String(s.date ?? new Date().toLocaleDateString()),
    createdAt: s.created_at ?? s.createdAt,
    status,
    chunkCount,
    extractedTextLength,
    processingError: s.error ?? s.processing_error ?? undefined,
  };
}

export async function getSourceDebug(sourceId: string): Promise<SourceDebug> {
  const res = await apiFetch(API_ROUTES.sourceDebug(sourceId), { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404) {
      throw new Error("The backend does not expose source debug status yet. Confirm Render deployed the latest backend.");
    }
    throw new Error(`Unable to inspect source (${res.status}): ${text}`);
  }
  return res.json();
}

export function sourceFromDebug(debug: SourceDebug, fallback?: Partial<Source>): Source {
  return {
    id: debug.source_id,
    name: debug.filename || fallback?.name || "Untitled",
    type: fallback?.type ?? "pdf",
    url: fallback?.url,
    date: fallback?.date ?? new Date().toLocaleDateString(),
    createdAt: fallback?.createdAt,
    status: debug.status,
    summary: fallback?.summary,
    keyConcepts: fallback?.keyConcepts,
    size: fallback?.size,
    chunkCount: debug.chunk_count,
    extractedTextLength: debug.extracted_text_length,
    processingError: debug.error,
  };
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return typeof parsed?.detail === "string" ? parsed.detail : fallback;
  } catch {
    return text || fallback;
  }
}

function normalizeDifficulty(value: unknown): QuizDifficulty {
  const text = String(value ?? "").toLowerCase();
  if (text === "easy" || text === "medium" || text === "hard") return text;
  return "medium";
}

export type GeneratedQuiz = {
  quizId: string;
  sourceIds: string[];
  questions: QuizQuestion[];
};

export async function generateQuizFromSources(
  sourceIds: string[],
  questionCount = 8,
  difficulty: QuizDifficulty | "mixed" = "mixed",
): Promise<GeneratedQuiz> {
  const res = await apiFetch(API_ROUTES.quizGenerate, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_ids: sourceIds, question_count: questionCount, difficulty }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Quiz generation failed."));
  }

  const payload = await res.json();
  const questions: QuizQuestion[] = (Array.isArray(payload.questions) ? payload.questions : []).map((question: any) => {
    const choices = Array.isArray(question.choices) ? question.choices.map(String) : [];
    const correctAnswer = String(question.correct_answer ?? "");
    return {
      id: String(question.id ?? crypto.randomUUID()),
      topic: String(question.topic ?? "Source concept"),
      difficulty: normalizeDifficulty(question.difficulty),
      prompt: String(question.question ?? ""),
      choices,
      correctChoiceIndex: Math.max(0, choices.indexOf(correctAnswer)),
      explanation: String(question.explanation ?? ""),
      sourceId: question.source_id ? String(question.source_id) : sourceIds[0],
      sourceExcerpt: question.source_excerpt ? String(question.source_excerpt) : undefined,
    };
  }).filter((question) => question.prompt && question.choices.length === 4);

  return {
    quizId: String(payload.quiz_id ?? crypto.randomUUID()),
    sourceIds: Array.isArray(payload.source_ids) ? payload.source_ids.map(String) : sourceIds,
    questions,
  };
}

export type GeneratedDeck = {
  deck: FlashcardDeck;
  cards: Flashcard[];
};

export async function generateDeckFromSources(
  sourceId: string,
  numCards = 12,
  difficulty: "easy" | "mixed" | "hard" = "mixed",
  deckName?: string,
): Promise<GeneratedDeck> {
  const res = await apiFetch(API_ROUTES.deckGenerate, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: sourceId, num_cards: numCards, difficulty, deck_name: deckName }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Flashcard deck generation failed."));
  }

  const payload = await res.json();
  const deckId = String(payload.deck_id ?? payload.deck?.id ?? crypto.randomUUID());
  const cards: Flashcard[] = (Array.isArray(payload.cards) ? payload.cards : []).map((card: any) => ({
    id: String(card.id ?? crypto.randomUUID()),
    deckId,
    sourceId,
    question: String(card.question ?? ""),
    answer: String(card.answer ?? ""),
    tags: Array.isArray(card.tags) ? card.tags.map(String).filter(Boolean) : [],
    topic: card.topic ? String(card.topic) : undefined,
    difficulty: card.difficulty ? String(card.difficulty) : undefined,
    sourceExcerpt: card.source_excerpt ? String(card.source_excerpt) : undefined,
    masteryScore: 0,
    nextReviewDate: new Date().toISOString(),
    reviewCount: 0,
  })).filter((card) => card.question && card.answer);

  return {
    deck: {
      id: deckId,
      name: String(payload.deck?.name ?? deckName ?? "Generated deck"),
      sourceId,
      createdAt: String(payload.deck?.created_at ?? new Date().toISOString()),
      cardIds: cards.map((card) => card.id),
    },
    cards,
  };
}
