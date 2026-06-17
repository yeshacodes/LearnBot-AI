import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, FileText, Layers, Loader2, MessageSquare, Save, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { askAiWithSources } from "../src/services/aiService";
import { getSourceDebug } from "../src/lib/api";
import { AppRoute } from "../types";
import { Link, useSearchParams } from "react-router-dom";
import { getBool } from "../src/lib/uiPrefs";

const CHAT_CONTEXT_COLLAPSED_KEY = "learnbot_chat_context_collapsed";

const suggestedPrompts = [
  "Summarize this source in five study bullets.",
  "Explain the hardest concept with an example.",
  "What should I review before taking a quiz?",
  "Create a focused study plan from this source.",
];

const formatTime = (value: Date | string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

  const sortedSessions = useMemo(
    () => [...data.chatSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [data.chatSessions],
  );
  const session = useMemo(
    () => data.chatSessions.find((item) => item.id === sessionId) ?? sortedSessions[0],
    [data.chatSessions, sessionId, sortedSessions],
  );
  const allSources = data.sources;
  const isSourceChatReady = (source: (typeof data.sources)[number]) =>
    source.status === "ready" && (source.chunkCount ?? 0) > 0 && (source.extractedTextLength ?? 1) > 0;
  const readySources = useMemo(() => allSources.filter(isSourceChatReady), [allSources]);

  useEffect(() => {
    if (!initialSourceId || selectedSourceIds.length) return;
    if (allSources.some((source) => source.id === initialSourceId)) setSelectedSourceIds([initialSourceId]);
  }, [initialSourceId, allSources, selectedSourceIds.length]);

  useEffect(() => {
    const onPrefsChanged = (event: Event) => {
      const nextCollapsed = getBool(CHAT_CONTEXT_COLLAPSED_KEY, false);
      setPanelsCollapsed(nextCollapsed);
      if (nextCollapsed) {
        setMobilePanelsOpen(false);
        return;
      }
      const detail = (event as CustomEvent<{ key?: string; value?: boolean }>).detail;
      if (detail?.key === CHAT_CONTEXT_COLLAPSED_KEY && typeof window !== "undefined" && window.innerWidth < 1280) {
        setMobilePanelsOpen(true);
      }
    };
    window.addEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
    return () => window.removeEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
  }, []);

  const activeSourceIds = useMemo(
    () => (selectedSourceIds.length ? selectedSourceIds : readySources.map((source) => source.id)),
    [readySources, selectedSourceIds],
  );
  const activeSources = useMemo(
    () => data.sources.filter((source) => activeSourceIds.includes(source.id)),
    [data.sources, activeSourceIds],
  );
  const selectedHasNoChunks = selectedSourceIds.length > 0 && activeSources.some((source) => !isSourceChatReady(source));
  const sourceWarning = selectedHasNoChunks ? "This source is not ready for chat." : null;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session?.messages, isLoading]);

  useEffect(() => {
    if (!sessionId && data.chatSessions.length === 0) setSessionId(data.createChatSession().id);
    else if (!sessionId && data.chatSessions[0]) setSessionId(data.chatSessions[0].id);
  }, [data, sessionId]);

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

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [sourceId]));
    setMobilePanelsOpen(false);
  };

  const startNewChat = () => {
    const next = data.createChatSession(activeSourceIds);
    setSessionId(next.id);
    setChatError(null);
  };

  const handleSendMessage = async (override?: string) => {
    const content = (override ?? inputValue).trim();
    if (!content || isLoading || !session || readySources.length === 0 || selectedHasNoChunks) return;
    setChatError(null);
    data.addChatMessage(session.id, { role: "user", content, sourceIds: activeSourceIds });
    setInputValue("");
    setIsLoading(true);
    try {
      const result = await askAiWithSources(content, activeSourceIds);
      data.addChatMessage(session.id, {
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
      data.addChatMessage(session.id, {
        role: "assistant",
        content: `I saved your question, but the AI service was not reachable. Selected context: ${sourceNames || "all ready sources"}.`,
        sourceIds: activeSourceIds,
      });
      setChatError(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const panelContent = (
    <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-default bg-card p-3 shadow-[0_14px_38px_-32px_var(--shadow)]">
      <section className="border-b border-default pb-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium text-muted">Recent chats</h2>
          <span className="text-xs text-muted">{sortedSessions.length}</span>
        </div>
        <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
          {sortedSessions.length ? (
            sortedSessions.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSessionId(item.id);
                  setMobilePanelsOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 ${item.id === session?.id ? "bg-slate-50 text-primary shadow-sm dark:bg-white/10" : "text-muted hover:bg-slate-50 hover:text-primary dark:hover:bg-white/10"}`}
              >
                <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.messages.length} messages - {new Date(item.updatedAt).toLocaleDateString()}</p>
              </button>
            ))
          ) : (
            <EmptyState title="No chat history" description="Start with a question about your source." embedded />
          )}
        </div>
      </section>

      <section className="min-h-0 flex-1 pt-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-sm font-semibold text-primary">Materials</h2>
            <p className="mt-0.5 text-xs text-muted">{readySources.length} ready for chat</p>
          </div>
          <Badge color={selectedSourceIds.length ? "purple" : "gray"}>{selectedSourceIds.length ? "Selected" : "All"}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              setSelectedSourceIds([]);
              setMobilePanelsOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 ${selectedSourceIds.length === 0 ? "bg-indigo-50 text-primary dark:bg-indigo-400/10" : "text-muted hover:-translate-y-0.5 hover:bg-slate-50 hover:text-primary dark:hover:bg-white/10"}`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="min-w-0 flex-1">All ready sources</span>
            <span className="text-xs text-muted">{readySources.length}</span>
          </button>
        </div>

        <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {allSources.map((source) => {
            const isSelected = selectedSourceIds.includes(source.id);
            const isReady = isSourceChatReady(source);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => toggleSourceSelection(source.id)}
                aria-pressed={isSelected}
                className={`w-full rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 ${
                  isSelected
                    ? "border-indigo-200 bg-indigo-50 text-primary shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10"
                    : "border-transparent bg-transparent text-muted hover:border-slate-200 hover:bg-slate-50 hover:text-primary dark:hover:border-white/10 dark:hover:bg-white/10"
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isReady ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-primary">{source.name}</p>
                      <Badge color={isReady ? "green" : source.status === "failed" ? "red" : "orange"}>{isReady ? "ready" : source.status}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {isReady ? `${source.chunkCount ?? 0} study sections available` : source.processingError ?? "Processing is not complete yet."}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          {!allSources.length && (
            <EmptyState title="No ready sources" description="Upload a source before asking grounded questions." action={<Link to={AppRoute.UPLOAD}><Button variant="outline">Upload</Button></Link>} embedded />
          )}
        </div>

        {sourceWarning && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-800">
            {sourceWarning}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-150px)] flex-col gap-6 pb-6">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Chat" }]}
        title="AI study assistant"
        description="Ask questions grounded in your uploaded sources."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={MessageSquare} onClick={startNewChat}>New chat</Button>
            <Button className="xl:hidden" variant="soft" icon={FileText} onClick={() => setMobilePanelsOpen(true)}>Panels</Button>
          </div>
        }
      />

      {mobilePanelsOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Chat panels">
          <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" type="button" aria-label="Close chat panels" onClick={() => setMobilePanelsOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto bg-background p-4 shadow-2xl custom-scrollbar">
            {panelContent}
          </aside>
        </div>
      )}

      <div className={`grid min-h-0 flex-1 gap-6 ${panelsCollapsed ? "grid-cols-1" : "xl:grid-cols-[320px_minmax(0,1fr)]"}`}>
        {!panelsCollapsed && (
          <aside className="hidden min-w-0 flex-col gap-4 overflow-hidden xl:flex">
            {panelContent}
          </aside>
        )}

        <div className="flex min-h-[36rem] min-w-0 flex-col">
          {chatError && <div className="mb-4"><ErrorState title="AI response failed" message={chatError} /></div>}

          <Card className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar" aria-live="polite">
              <div className="mx-auto flex w-full max-w-4xl flex-col space-y-5">
                {!session || session.messages.length === 0 ? (
                  <EmptyState
                    title="Start a study chat"
                    description="Ask LearnBot to summarize, explain, quiz, or extract flashcards from your selected sources."
                    action={<Button variant="outline" onClick={() => handleSendMessage(suggestedPrompts[0])}>Use a prompt</Button>}
                    embedded
                  />
                ) : (
                  session.messages.map((message) => (
                    <div key={message.id} className={`flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[min(88%,880px)] rounded-2xl border p-4 shadow-[0_16px_42px_-34px_var(--shadow)] ${message.role === "user" ? "border-indigo-600 bg-indigo-600 text-white" : "border-default bg-white text-primary dark:bg-white/5"}`}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className={`text-xs font-medium ${message.role === "user" ? "text-white/75" : "text-muted"}`}>{message.role === "user" ? "You" : "LearnBot"}</span>
                        <time className={`text-xs ${message.role === "user" ? "text-white/70" : "text-muted"}`}>{formatTime(message.timestamp)}</time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      {message.citations?.length ? (
                        <div className="mt-4 space-y-2">
                          {message.citations.map((citation, index) => (
                            <div key={`${message.id}-${index}`} className="rounded-lg border border-default bg-slate-50 p-2 text-xs text-muted dark:bg-white/5">
                              <span className="font-medium text-primary">{citation.title}</span>: {citation.snippet}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {message.role === "assistant" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="soft" className="min-h-8 px-3 py-1 text-xs" icon={Clipboard} onClick={() => navigator.clipboard?.writeText(message.content)}>Copy</Button>
                          <Button variant="soft" className="min-h-8 px-3 py-1 text-xs" icon={Save} onClick={() => data.saveMessageAsNote(session.id, message.id)}>{message.savedAsNote ? "Saved" : "Save note"}</Button>
                          <Button variant="soft" className="min-h-8 px-3 py-1 text-xs" icon={Layers} onClick={() => data.createFlashcardsFromMessage(session.id, message.id)}>Create cards</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-default bg-white px-4 py-3 text-sm font-medium text-muted shadow-sm dark:bg-white/5">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      LearnBot is typing
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mx-auto mt-5 w-full max-w-4xl space-y-4 border-t border-default pt-4">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={readySources.length === 0 || isLoading || selectedHasNoChunks}
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-xl border border-default bg-white px-3 py-2 text-sm font-medium text-primary transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 disabled:pointer-events-none disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-default bg-white p-2 shadow-[0_14px_38px_-32px_var(--shadow)] dark:bg-white/5">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) handleSendMessage();
                  }}
                  aria-label="Ask LearnBot"
                  placeholder={!readySources.length ? "Upload a source to start chatting" : selectedHasNoChunks ? "This source is not ready for chat" : "Ask a question about your selected sources"}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium text-primary outline-none placeholder:text-muted focus-visible:ring-0"
                  disabled={isLoading || readySources.length === 0 || selectedHasNoChunks}
                />
                <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading || readySources.length === 0 || selectedHasNoChunks} icon={Send} aria-label="Send message">
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 xl:hidden">
                {readySources.map((source) => (
                  <button key={source.id} type="button" onClick={() => toggleSourceSelection(source.id)} aria-pressed={selectedSourceIds.includes(source.id)}>
                    <Badge color={selectedSourceIds.includes(source.id) ? "purple" : "gray"}>{source.name}</Badge>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
