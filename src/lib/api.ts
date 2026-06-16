import { supabase } from "./supabase";
import type { Source } from "../../types";

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
  flashcards: "/api/flashcards",
  flashcardGenerate: "/api/flashcards/generate",
} as const;

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
