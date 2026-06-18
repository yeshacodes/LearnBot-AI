import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Clipboard, FileText, Layers, Loader2, MessageSquare, Plus, Save, Send, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { getSourceDebug } from "../src/lib/api";
import { askAiWithSources } from "../src/services/aiService";
import { getBool } from "../src/lib/uiPrefs";
import { AppRoute, ChatMessage, Source } from "../types";

const CHAT_CONTEXT_COLLAPSED_KEY = "learnbot_chat_context_collapsed";

const suggestedPrompts = [
  "Explain this lecture",
  "Summarize",
  "Quiz me",
  "Create flashcards",
  "Important topics",
];

const promptMap: Record<string, string> = {
  "Explain this lecture": "Explain the selected material like a clear study note with examples.",
  Summarize: "Summarize this source into concise study notes.",
  "Quiz me": "Quiz me on the most important ideas from this source.",
  "Create flashcards": "Create flashcards from the most important ideas in this source.",
  "Important topics": "What are the most important topics I should understand from this material?",
};

const formatTime = (value: Date | string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const isSourceChatReady = (source: Source) =>
  source.status === "ready" && (source.chunkCount ?? 0) > 0 && (source.extractedTextLength ?? 1) > 0;

const uniqueIds = (ids: string[] = []) => [...new Set(ids.filter(Boolean))];
const sameIdSet = (left: string[], right: string[]) => {
  const leftIds = uniqueIds(left);
  const rightIds = uniqueIds(right);
  return leftIds.length === rightIds.length && leftIds.every((id) => rightIds.includes(id));
};

const getMaterialStats = (source: Source) => {
  const concepts = source.keyConcepts?.length ?? Math.min(Math.max(source.chunkCount ?? 3, 3), 18);
  const pages = Math.max(1, Math.ceil((source.chunkCount ?? 4) / 3));
  return { concepts, pages };
};

const getStudyCardTitle = (content: string) => {
  const firstLine = content
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim())
    .find(Boolean);
  if (!firstLine) return "Study Notes";
  return firstLine.length > 58 ? `${firstLine.slice(0, 55)}...` : firstLine;
};

type StudySection = {
  title: string;
  blocks: Array<{ type: "paragraph" | "bullet" | "example"; text: string }>;
};

const stripMarkdown = (value: string) =>
  value
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

const normalizeSectionTitle = (value: string) =>
  stripMarkdown(value)
    .replace(/^\d+[.)]\s*/, "")
    .replace(/:$/, "")
    .trim();

const isSectionHeading = (line: string) => {
  const clean = normalizeSectionTitle(line);
  if (!clean || clean.length > 64) return false;
  if (/^#{1,6}\s+/.test(line)) return true;
  return /^(why it matters|example|from your notes|try this|quick check|how to think about it|what changes|intuition|source|summary)$/i.test(clean);
};

const isExampleLike = (line: string) =>
  /^(original|after|before|step\s*\d+|input|output)\b/i.test(stripMarkdown(line)) ||
  /^[01](\s+[01]){2,}$/.test(line.trim());

const parseStudyNote = (content: string) => {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstHeadingIndex = lines.findIndex((line) => /^#{1,6}\s+/.test(line));
  const title = firstHeadingIndex >= 0 ? normalizeSectionTitle(lines[firstHeadingIndex]) : getStudyCardTitle(content);
  const bodyLines = lines
    .filter((_, index) => index !== firstHeadingIndex)
    .filter((line, index) => index > 0 || normalizeSectionTitle(line) !== title);

  const sections: StudySection[] = [{ title: "Explanation", blocks: [] }];
  for (const line of bodyLines) {
    if (isSectionHeading(line)) {
      const nextTitle = normalizeSectionTitle(line);
      if (nextTitle && !/^source$/i.test(nextTitle)) sections.push({ title: nextTitle, blocks: [] });
      continue;
    }

    const cleanLine = stripMarkdown(line.replace(/^[-*•]\s*/, ""));
    if (!cleanLine) continue;
    const current = sections[sections.length - 1];
    const type = /^[-*•]\s*/.test(line)
      ? "bullet"
      : isExampleLike(cleanLine) || /example/i.test(current.title)
        ? "example"
        : "paragraph";
    const previous = current.blocks[current.blocks.length - 1];
    if (previous?.type === "example" && type === "example") {
      previous.text = `${previous.text}\n${cleanLine}`;
      continue;
    }
    current.blocks.push({ type, text: cleanLine });
  }

  const cleanedSections = sections.filter((section) => section.blocks.length > 0);
  return {
    title,
    sections: cleanedSections.length ? cleanedSections : [{ title: "Explanation", blocks: [{ type: "paragraph", text: stripMarkdown(content) }] }],
  };
};

const MaterialCard = ({
  source,
  selected,
  onSelect,
}: {
  source: Source;
  selected: boolean;
  onSelect: () => void;
}) => {
  const stats = getMaterialStats(source);
  const ready = isSourceChatReady(source);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-[1.4rem] border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 ${
        selected
          ? "border-[#AFC7ED] bg-[#DCEBFF] shadow-[0_18px_50px_rgba(40,32,20,0.08)]"
          : "border-[#D9D1B8] bg-white hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D9D1B8] ${selected ? "bg-white" : "bg-[#FFF6B8]"}`}>
          <FileText className="h-5 w-5 text-[#050505]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#050505]">{source.name}</p>
          <p className="mt-1 text-xs font-medium text-[#3F3F3A]">
            {ready ? `${stats.pages} pages • ${stats.concepts} concepts` : source.status === "failed" ? "Needs attention" : "Preparing"}
          </p>
        </div>
      </div>
    </button>
  );
};

const StudyResponseCard = ({
  message,
  sessionId,
  onExplain,
  onQuiz,
  onSave,
  onCards,
}: {
  message: ChatMessage;
  sessionId: string;
  onExplain: (content: string) => void;
  onQuiz: (content: string) => void;
  onSave: (sessionId: string, messageId: string) => void;
  onCards: (sessionId: string, messageId: string) => void;
}) => {
  const note = parseStudyNote(message.content);
  const primaryCitation = message.citations?.[0];

  return (
    <article className="rounded-[28px] border border-[#D9D1B8] bg-white p-7 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#6B675F]">Study card</p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-[-0.04em] text-[#050505]">{note.title}</h2>
        </div>
        <time className="shrink-0 text-xs font-medium text-[#6B675F]">{formatTime(message.timestamp)}</time>
      </div>

      <div className="my-6 h-px bg-[#D9D1B8]" />

      <div className="space-y-6">
        {note.sections.map((section) => (
          <section key={`${section.title}-${section.blocks[0]?.text}`}>
            {section.title !== "Explanation" && (
              <h3 className="text-sm font-black text-[#050505]">{section.title}</h3>
            )}
            <div className={section.title !== "Explanation" ? "mt-3 space-y-3" : "space-y-3"}>
              {section.blocks.map((block, index) => {
                if (block.type === "bullet") {
                  return (
                    <div key={`${block.text}-${index}`} className="flex gap-3 text-[15px] leading-7 text-[#050505]">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#050505]" />
                      <p>{block.text}</p>
                    </div>
                  );
                }
                if (block.type === "example") {
                  return (
                    <pre key={`${block.text}-${index}`} className="overflow-x-auto rounded-[1.25rem] border border-[#D9D1B8] bg-[#FFFBEA] p-4 font-mono text-sm leading-7 text-[#050505]">
                      {block.text}
                    </pre>
                  );
                }
                return (
                  <p key={`${block.text}-${index}`} className="text-[15px] leading-7 text-[#3F3F3A]">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="my-6 h-px bg-[#D9D1B8]" />

      <section>
        <h3 className="text-sm font-black text-[#050505]">From Your Notes</h3>
        <blockquote className="mt-3 rounded-[1.25rem] border border-[#D9D1B8] bg-[#FFF6B8] p-4 text-[15px] leading-7 text-[#3F3F3A]">
          “{primaryCitation?.snippet ?? message.content.slice(0, 180)}”
        </blockquote>
      </section>

      <div className="my-6 h-px bg-[#D9D1B8]" />

      <section className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#3F3F3A]">
        <span className="text-[#050505]">Source</span>
        <span className="rounded-full border border-[#D9D1B8] bg-[#FFF6B8] px-3 py-1">
          {primaryCitation?.title ?? "Selected material"}{primaryCitation?.pageNumber ? ` • Page ${primaryCitation.pageNumber}` : ""}
        </span>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10" type="button" onClick={() => onExplain(message.content)}>
          Explain Simpler
        </button>
        <button className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10" type="button" onClick={() => onCards(sessionId, message.id)}>
          Make Flashcards
        </button>
        <button className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10" type="button" onClick={() => onQuiz(message.content)}>
          Generate Quiz
        </button>
        <button className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10" type="button" onClick={() => onSave(sessionId, message.id)}>
          {message.savedAsNote ? "Saved" : "Save to Memory"}
        </button>
      </div>
    </article>
  );
};

const Chat: React.FC = () => {
  const data = useLearningData();
  const [searchParams] = useSearchParams();
  const initialSourceId = searchParams.get("sourceId");
  const [sessionId, setSessionId] = useState(() => data.chatSessions[0]?.id ?? "");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [panelsCollapsed, setPanelsCollapsed] = useState<boolean>(() => getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
  const [mobilePanelsOpen, setMobilePanelsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allSources = data.sources;
  const readySources = useMemo(() => allSources.filter(isSourceChatReady), [allSources]);
  const readySourceIds = useMemo(() => readySources.map((source) => source.id), [readySources]);
  const readySourceIdSet = useMemo(() => new Set(readySourceIds), [readySourceIds]);

  const sortedSessions = useMemo(
    () =>
      data.chatSessions
        .filter((session) => session.sourceIds.length > 0 && session.sourceIds.every((sourceId) => readySourceIdSet.has(sourceId)))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [data.chatSessions, readySourceIdSet],
  );

  const session = useMemo(
    () => sortedSessions.find((item) => item.id === sessionId),
    [sessionId, sortedSessions],
  );

  useEffect(() => {
    if (readySources.length === 0) {
      if (sessionId) setSessionId("");
      if (selectedSourceIds.length) setSelectedSourceIds([]);
      return;
    }

    const querySourceId = initialSourceId && readySourceIdSet.has(initialSourceId) ? initialSourceId : null;
    const selectedExistingSourceIds = selectedSourceIds.filter((sourceId) => allSources.some((source) => source.id === sourceId));
    const validSelectedSourceIds = selectedSourceIds.filter((sourceId) => readySourceIdSet.has(sourceId));
    if (!querySourceId && selectedExistingSourceIds.length > 0 && validSelectedSourceIds.length === 0) return;
    const fallbackSessionSourceIds = session?.sourceIds.filter((sourceId) => readySourceIdSet.has(sourceId)) ?? [];
    const nextSourceIds = querySourceId
      ? [querySourceId]
      : validSelectedSourceIds.length
        ? validSelectedSourceIds
        : fallbackSessionSourceIds.length
          ? fallbackSessionSourceIds
          : sortedSessions[0]?.sourceIds ?? [readySources[0].id];

    if (!sameIdSet(selectedSourceIds, nextSourceIds)) {
      setSelectedSourceIds(nextSourceIds);
      return;
    }

    const nextSession = data.createChatSession(nextSourceIds);
    if (sessionId !== nextSession.id) setSessionId(nextSession.id);
  }, [allSources, data, initialSourceId, readySources, readySourceIdSet, selectedSourceIds, session?.sourceIds, sessionId, sortedSessions]);

  useEffect(() => {
    const onPrefsChanged = () => {
      const nextCollapsed = getBool(CHAT_CONTEXT_COLLAPSED_KEY, false);
      setPanelsCollapsed(nextCollapsed);
      if (nextCollapsed) setMobilePanelsOpen(false);
    };
    window.addEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
    return () => window.removeEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
  }, []);

  const activeSourceIds = useMemo(
    () => {
      const validSelectedSourceIds = selectedSourceIds.filter((sourceId) => readySourceIdSet.has(sourceId));
      return selectedSourceIds.length ? validSelectedSourceIds : readySourceIds;
    },
    [readySourceIds, readySourceIdSet, selectedSourceIds],
  );
  const activeSources = useMemo(
    () => data.sources.filter((source) => activeSourceIds.includes(source.id)),
    [data.sources, activeSourceIds],
  );
  const selectedHasNoChunks =
    selectedSourceIds.length > 0 &&
    selectedSourceIds.some((sourceId) => {
      const source = allSources.find((item) => item.id === sourceId);
      return !source || !isSourceChatReady(source);
    });
  const activeSource = activeSources[0] ?? readySources[0] ?? allSources[0];
  const dueCards = data.flashcards.filter((card) => !card.nextReviewDate || new Date(card.nextReviewDate) <= new Date()).length;
  const weakTopic = data.quizAttempts.find((attempt) => attempt.weakTopics.length)?.weakTopics[0] ?? data.quizQuestions[0]?.topic ?? "Corner detection";
  const quizReady = data.quizQuestions.length > 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session?.messages, isLoading]);

  useEffect(() => {
    let cancelled = false;
    const refreshSourceDebug = async () => {
      for (const source of activeSources) {
        if (!source.id || source.id.startsWith("source-")) continue;
        if (source.chunkCount !== undefined && source.extractedTextLength !== undefined) continue;
        try {
          const debug = await getSourceDebug(source.id);
          if (cancelled) return;
          data.updateSource(source.id, {
            status: debug.status,
            chunkCount: debug.chunk_count,
            extractedTextLength: debug.extracted_text_length,
            processingError: debug.error,
          });
        } catch {
          if (cancelled) return;
          data.updateSource(source.id, {
            status: "failed",
            chunkCount: 0,
            extractedTextLength: 0,
            processingError: "This source has not been processed yet or contains no readable text.",
          });
        }
      }
    };
    void refreshSourceDebug();
    return () => {
      cancelled = true;
    };
  }, [activeSources, data]);

  const selectSource = (sourceId: string) => {
    const nextSourceIds = sourceId ? [sourceId] : readySourceIds;
    setSelectedSourceIds(nextSourceIds);
    if (nextSourceIds.length) setSessionId(data.createChatSession(nextSourceIds).id);
    setMobilePanelsOpen(false);
  };

  const startNewChat = () => {
    if (activeSourceIds.length === 0) return;
    const next = data.createChatSession(activeSourceIds, { forceNew: true });
    setSessionId(next.id);
    setChatError(null);
  };

  const handleSendMessage = async (override?: string) => {
    const content = (override ?? inputValue).trim();
    if (!content || isLoading || readySources.length === 0 || activeSourceIds.length === 0 || selectedHasNoChunks) return;
    const targetSession = session ?? data.createChatSession(activeSourceIds);
    setChatError(null);
    if (targetSession.id !== sessionId) setSessionId(targetSession.id);
    const userMessage = data.addChatMessage(targetSession.id, { role: "user", content, sourceIds: activeSourceIds });
    setInputValue("");
    setIsLoading(true);
    try {
      const result = await askAiWithSources(content, activeSourceIds, [...targetSession.messages, userMessage]);
      data.addChatMessage(targetSession.id, {
        role: "assistant",
        content: result.answer,
        citations: result.citations.map((citation) => ({
          title: citation.title ?? citation.source_name ?? "Source",
          snippet: citation.snippet,
          pageNumber: citation.pageNumber ?? citation.page ?? undefined,
        })),
        sourceIds: activeSourceIds,
      });
    } catch (error) {
      const sourceNames = readySources.filter((source) => activeSourceIds.includes(source.id)).map((source) => source.name).join(", ");
      data.addChatMessage(targetSession.id, {
        role: "assistant",
        content: `I saved your question, but the AI service was not reachable. Selected context: ${sourceNames || "all ready sources"}.`,
        sourceIds: activeSourceIds,
      });
      setChatError(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const leftPanel = (
    <aside className="flex min-h-0 flex-col rounded-[28px] border border-[#D9D1B8] bg-white p-5 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-[-0.04em] text-[#050505]">Materials</h2>
        <span className="rounded-full border border-[#D9D1B8] bg-[#FFF6B8] px-3 py-1 text-xs font-semibold text-[#3F3F3A]">{allSources.length}</span>
      </div>
      <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => selectSource("")}
          className={`w-full rounded-[1.4rem] border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 ${
            sameIdSet(selectedSourceIds, readySourceIds) ? "border-[#AFC7ED] bg-[#DCEBFF] shadow-[0_18px_50px_rgba(40,32,20,0.08)]" : "border-[#D9D1B8] bg-[#FFF6B8] hover:bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D9D1B8] bg-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">All materials</p>
              <p className="mt-1 text-xs font-medium text-[#3F3F3A]">{readySources.length} ready sources</p>
            </div>
          </div>
        </button>
        {allSources.map((source) => (
          <MaterialCard key={source.id} source={source} selected={selectedSourceIds.includes(source.id)} onSelect={() => selectSource(source.id)} />
        ))}
        {!allSources.length && (
          <div className="rounded-[1.4rem] border border-[#D9D1B8] bg-white p-5 text-sm leading-6 text-[#3F3F3A]">
            Upload a readable source to begin grounded study.
          </div>
        )}
      </div>
      <Link
        to={AppRoute.UPLOAD}
        className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#050505] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#050505]/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10"
      >
        <Plus className="h-4 w-4" />
        Upload Source
      </Link>
    </aside>
  );

  const rightPanel = (
    <aside className="rounded-[28px] border border-[#D9D1B8] bg-white p-6 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
      <h2 className="text-2xl font-black tracking-[-0.04em] text-[#050505]">Study Queue</h2>
      <div className="mt-6 space-y-4 text-sm font-semibold text-[#3F3F3A]">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-[#050505]" />
          <span>Summary completed</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full border border-[#050505]" />
          <span>{quizReady ? "Quiz ready" : "Quiz can be generated"}</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full border border-[#050505]" />
          <span>{dueCards || 7} flashcards due</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 rounded-full border border-[#050505]" />
          <span>Weak topic:<br /><strong className="font-black text-[#050505]">{weakTopic}</strong></span>
        </div>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-[#D9D1B8] bg-[#FFF6B8] p-5">
        <p className="text-sm font-black text-[#050505]">Current source</p>
        <p className="mt-2 text-sm leading-6 text-[#3F3F3A]">{activeSource?.name ?? "No source selected yet"}</p>
      </div>
    </aside>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] rounded-[32px] bg-[#FFFBEA] p-4 text-[#050505] md:p-6">
      {mobilePanelsOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Study coach panels">
          <button className="absolute inset-0 bg-[#050505]/25" type="button" aria-label="Close panels" onClick={() => setMobilePanelsOpen(false)} />
          <div className="absolute inset-y-3 left-3 flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-3 overflow-y-auto rounded-[28px] bg-[#FFFBEA] p-3 shadow-2xl custom-scrollbar">
            {leftPanel}
            {rightPanel}
          </div>
        </div>
      )}

      <div className={`grid min-h-[calc(100vh-11rem)] gap-5 ${panelsCollapsed ? "grid-cols-1" : "xl:grid-cols-[280px_minmax(0,1fr)_300px]"}`}>
        {!panelsCollapsed && <div className="hidden min-h-0 xl:block">{leftPanel}</div>}

        <main className="relative flex min-h-0 flex-col rounded-[28px] border border-[#D9D1B8] bg-white shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
          <header className="border-b border-[#D9D1B8] px-6 py-6 md:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-black leading-tight tracking-[-0.04em] text-[#050505]">✦ Study Coach</h1>
                <p className="mt-2 text-base font-medium text-[#3F3F3A]">Ask questions directly from your material.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={startNewChat} className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10">
                  New session
                </button>
                <button type="button" onClick={() => setMobilePanelsOpen(true)} className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 xl:hidden">
                  Materials
                </button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={readySources.length === 0 || isLoading || selectedHasNoChunks}
                  onClick={() => handleSendMessage(promptMap[prompt])}
                  className="rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 disabled:pointer-events-none disabled:border-[#A7A29A] disabled:bg-[#A7A29A] disabled:text-white disabled:opacity-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </header>

          {chatError && (
            <div className="mx-6 mt-5 rounded-[1.25rem] border border-[#D9D1B8] bg-[#EFE7FF] p-4 text-sm font-semibold text-[#050505] md:mx-8">
              AI response failed: {chatError}
            </div>
          )}

          {selectedHasNoChunks && (
            <div className="mx-6 mt-5 rounded-[1.25rem] border border-[#D9D1B8] bg-[#EFE7FF] p-4 text-sm font-semibold text-[#050505] md:mx-8">
              This source is not ready for chat.
            </div>
          )}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6 custom-scrollbar md:px-8" aria-live="polite">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              {readySources.length === 0 ? (
                <div className="rounded-[28px] border border-[#D9D1B8] bg-white p-8 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
                  <BookOpen className="h-8 w-8 text-[#050505]" />
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">Upload a source to start a study chat.</h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-[#3F3F3A]">
                    Study Coach only keeps conversations connected to available materials.
                  </p>
                  <Link
                    to={AppRoute.UPLOAD}
                    className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#050505] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#050505]/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10"
                  >
                    Upload source
                  </Link>
                </div>
              ) : !session || session.messages.length === 0 ? (
                <div className="rounded-[28px] border border-[#D9D1B8] bg-white p-8 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
                  <BookOpen className="h-8 w-8 text-[#050505]" />
                  <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">Start with your material.</h2>
                  <p className="mt-3 max-w-xl text-base leading-7 text-[#3F3F3A]">
                    Choose a source, then ask LearnBot to explain, summarize, quiz, or turn it into recall practice.
                  </p>
                </div>
              ) : (
                session.messages.map((message) =>
                  message.role === "assistant" ? (
                    <StudyResponseCard
                      key={message.id}
                      message={message}
                      sessionId={session.id}
                      onExplain={(content) => handleSendMessage(`Continue from the previous study note. Explain the same topic more simply with one concrete example. Do not repeat the full answer. Previous note: ${content.slice(0, 500)}`)}
                      onQuiz={(content) => handleSendMessage(`Continue from the previous study note. Ask me three quick check questions about the same topic, then wait for my answers. Previous note: ${content.slice(0, 500)}`)}
                      onSave={data.saveMessageAsNote}
                      onCards={data.createFlashcardsFromMessage}
                    />
                  ) : (
                    <div key={message.id} className="ml-auto max-w-[82%] rounded-[1.5rem] border border-[#AFC7ED] bg-[#DCEBFF] p-4 text-sm leading-6 text-[#050505]">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold text-[#3F3F3A]">
                        <span>Your question</span>
                        <time>{formatTime(message.timestamp)}</time>
                      </div>
                      {message.content}
                    </div>
                  ),
                )
              )}

              {isLoading && (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D9D1B8] bg-white px-4 py-3 text-sm font-semibold text-[#3F3F3A]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#050505]" />
                  Preparing study card
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-[#D9D1B8] bg-white/95 px-4 py-4 backdrop-blur md:px-8">
            <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-[#D9D1B8] bg-white p-2 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) handleSendMessage();
                }}
                aria-label="Ask Study Coach"
                placeholder={!readySources.length ? "Upload a source to start studying" : selectedHasNoChunks ? "This source is not ready for chat" : "What would you like to understand?"}
                className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm font-semibold text-[#050505] outline-none placeholder:text-[#6B675F]"
                disabled={isLoading || readySources.length === 0 || selectedHasNoChunks}
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || readySources.length === 0 || selectedHasNoChunks}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#050505] text-white transition hover:-translate-y-0.5 hover:bg-[#050505]/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 disabled:pointer-events-none disabled:bg-[#A7A29A] disabled:opacity-100"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>

        {!panelsCollapsed && <div className="hidden xl:block">{rightPanel}</div>}
      </div>
    </div>
  );
};

export default Chat;
