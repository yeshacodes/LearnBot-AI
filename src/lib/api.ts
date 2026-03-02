import { supabase } from "./supabase";
import type { Source } from "../../types";

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
  const res = await apiFetch(`/api/sources/${sourceId}`, {
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
    .map((s: any): Source => ({
      id: String(s.id ?? s.source_id ?? s.uuid ?? ""),
      name: String(s.name ?? s.filename ?? "Untitled"),
      type: (s.source_type === "url" || s.source_type === "web" || s.type === "url") ? "url" : "pdf",
      url: s.url ?? undefined,
      date: s.created_at
        ? new Date(s.created_at).toLocaleDateString()
        : String(s.date ?? ""),
      status:
        s.status === "processing" || s.status === "error" || s.status === "ready"
          ? s.status
          : "ready",
    }))
    .filter((x: Source) => x.id);
}
