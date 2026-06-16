import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, FileText, Layers, Loader2, MessageSquare, Save, Send, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { askAiWithSources } from "../src/services/aiService";
import { getSourceDebug } from "../src/lib/api";
import { AppRoute } from "../types";
import { Link } from "react-router-dom";

const suggestedPrompts = [
  "Summarize the selected source into five study bullets.",
  "Explain the hardest concept with a concrete example.",
  "What should I review before taking a quiz?",
  "Turn this source into a short study plan.",
];

const formatTime = (value: Date | string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Chat: React.FC = () => {
  const data = useLearningData();
  const [sessionId, setSessionId] = useState(() => data.chatSessions[0]?.id ?? "");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedSessions = useMemo(
    () => [...data.chatSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [data.chatSessions],
  );
  const session = useMemo(
    () => data.chatSessions.find((item) => item.id === sessionId) ?? sortedSessions[0],
    [data.chatSessions, sessionId, sortedSessions],
  );
  const readySources = useMemo(() => data.sources.filter((source) => source.status === "ready"), [data.sources]);
  const activeSourceIds = useMemo(
    () => (selectedSourceIds.length ? selectedSourceIds : readySources.map((source) => source.id)),
    [readySources, selectedSourceIds],
  );
  const activeSources = useMemo(
    () => data.sources.filter((source) => activeSourceIds.includes(source.id)),
    [data.sources, activeSourceIds],
  );
  const selectedHasNoChunks = activeSources.some(
    (source) => source.id.startsWith("source-") || source.status !== "ready" || source.chunkCount === 0 || source.extractedTextLength === 0,
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [session?.messages, isLoading]);

  useEffect(() => {
    if (!sessionId && data.chatSessions.length === 0) {
      setSessionId(data.createChatSession().id);
    } else if (!sessionId && data.chatSessions[0]) {
      setSessionId(data.chatSessions[0].id);
    }
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
    setSelectedSourceIds((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]));
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

  return (
    <div className="flex min-h-[calc(100vh-150px)] flex-col gap-6 pb-6">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Chat" }]}
        eyebrow="Assistant"
        title="Chat with your sources"
        description="Select context, keep conversation history, and turn useful answers into notes or cards."
        action={<Button variant="soft" icon={MessageSquare} onClick={startNewChat}>New chat</Button>}
      />

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="grid gap-4 lg:min-h-0">
          <Card className="p-4">
            <h2 className="px-2 text-sm font-bold text-muted">Chat history</h2>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1 custom-scrollbar lg:max-h-56">
              {sortedSessions.length ? (
                sortedSessions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSessionId(item.id)}
                    className={`w-full rounded-2xl p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${item.id === session?.id ? "bg-accent text-white" : "bg-surface2 text-primary hover:bg-accent/10"}`}
                  >
                    <p className="line-clamp-1 text-sm font-bold">{item.title}</p>
                    <p className={`mt-1 text-xs font-semibold ${item.id === session?.id ? "text-white/75" : "text-muted"}`}>
                      {item.messages.length} messages · {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-sm font-medium text-muted">No chat history yet.</p>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="px-2 text-sm font-bold text-muted">Source context</h2>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedSourceIds([])}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${selectedSourceIds.length === 0 ? "bg-accent text-white" : "bg-surface2 text-primary"}`}
              >
                <Sparkles className="h-4 w-4" />
                All ready sources
              </button>
              {readySources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSourceSelection(source.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${selectedSourceIds.includes(source.id) ? "bg-accent text-white" : "bg-surface2 text-primary"}`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{source.name}</span>
                </button>
              ))}
              {!readySources.length && (
                <EmptyState
                  title="No ready sources"
                  description="Upload a source before asking grounded questions."
                  action={<Link to={AppRoute.UPLOAD}><Button variant="soft">Upload</Button></Link>}
                  embedded
                />
              )}
              {readySources.length > 0 && selectedHasNoChunks && (
                <ErrorState
                  title="Source is not chat-ready"
                  message="This source has not been processed yet or contains no readable text."
                  embedded
                />
              )}
            </div>
          </Card>
        </aside>

        <div className="flex min-h-[36rem] flex-col">
          {chatError && <div className="mb-4"><ErrorState title="AI response failed" message={chatError} /></div>}

          <Card className="flex min-h-0 flex-1 flex-col p-4">
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar" aria-live="polite">
              {!session || session.messages.length === 0 ? (
                <EmptyState
                  title="Start a study chat"
                  description="Ask LearnBot to summarize, explain, quiz, or extract flashcards from your selected sources."
                  action={<Button variant="soft" onClick={() => handleSendMessage(suggestedPrompts[0])}>Use a prompt</Button>}
                  embedded
                />
              ) : (
                session.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-3xl p-5 shadow-sm md:max-w-[78%] ${message.role === "user" ? "bg-accent text-white" : "bg-surface2 text-primary"}`}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className={`text-xs font-bold ${message.role === "user" ? "text-white/75" : "text-muted"}`}>
                          {message.role === "user" ? "You" : "LearnBot"}
                        </span>
                        <time className={`text-xs font-semibold ${message.role === "user" ? "text-white/70" : "text-muted"}`}>
                          {formatTime(message.timestamp)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-6">{message.content}</p>
                      {message.citations?.length ? (
                        <div className="mt-4 space-y-2">
                          {message.citations.map((citation, index) => (
                            <div key={`${message.id}-${index}`} className="rounded-2xl bg-card p-3 text-xs font-medium text-muted">
                              <span className="font-bold text-primary">{citation.title}</span>: {citation.snippet}
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
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-surface2 px-5 py-4 text-sm font-bold text-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    LearnBot is typing
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4 border-t border-white/50 pt-4">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={readySources.length === 0 || isLoading || selectedHasNoChunks}
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-full bg-card px-4 py-2 text-sm font-bold text-primary transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-3xl bg-card p-2">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) handleSendMessage();
                  }}
                  aria-label="Ask LearnBot"
                  placeholder={
                    !readySources.length
                      ? "Upload a source to start chatting"
                      : selectedHasNoChunks
                        ? "This source is not ready for chat"
                        : "Ask a question about your selected sources"
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-semibold text-primary outline-none placeholder:text-muted focus-visible:ring-0"
                  disabled={isLoading || readySources.length === 0 || selectedHasNoChunks}
                />
                <Button onClick={() => handleSendMessage()} disabled={!inputValue.trim() || isLoading || readySources.length === 0 || selectedHasNoChunks} icon={Send} aria-label="Send message">
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
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
