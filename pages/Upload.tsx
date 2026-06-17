import React, { useState } from "react";
import { BookOpen, CheckCircle2, FileText, FileUp, Globe, Layers3, Link as LinkIcon, Loader2, MessageSquare, Sparkles, Target, UploadCloud } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppRoute } from "../types";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { API_ROUTES, apiFetch, generateDeckFromSources, generateQuizFromSources, getSourceDebug, normalizeSource, sourceFromDebug } from "../src/lib/api";
import type { Source } from "../types";

const processingSteps = ["Extracting text", "Finding key concepts", "Preparing study tools", "Ready to study"];

const Upload: React.FC = () => {
  const data = useLearningData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pdf" | "url">("pdf");
  const [url, setUrl] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const getUploadErrorMessage = (statusCode: number, payload: any, fallback: string) => {
    if (statusCode === 404) return "Upload route was not found on the backend. Confirm the frontend API base URL points to the FastAPI backend root.";
    if (statusCode === 0) return "Backend is unreachable. Check that the API service is running and the API base URL is correct.";
    return payload?.detail ?? fallback;
  };

  const finishSource = (sourceId: string, failed = false, updates: Partial<Source> = {}) => {
    data.updateSource(sourceId, { status: failed ? "failed" : "ready", ...updates });
    setStatus(failed ? "error" : "success");
  };

  const handleUrlIngest = async () => {
    if (!url.trim()) return;
    setIsIngesting(true);
    setError(null);
    setStatus("idle");
    let sourceName = url.trim();
    try {
      sourceName = new URL(url).hostname;
    } catch {
      setError("Enter a valid URL including https://");
      setIsIngesting(false);
      return;
    }
    const source = data.addSource({ name: sourceName, type: "url", url, status: "processing" });
    try {
      const res = await apiFetch(API_ROUTES.sourceWeb, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getUploadErrorMessage(res.status, payload, "Web ingestion failed."));
      const backendSource = normalizeSource({
        ...(payload?.source ?? {}),
        id: payload?.source_id ?? payload?.source?.id,
        chunk_count: payload?.chunk_count ?? payload?.source?.chunk_count,
        extracted_text_length: payload?.extracted_text_length ?? payload?.source?.extracted_text_length,
      });
      if (!backendSource.id || (backendSource.chunkCount ?? 0) <= 0) throw new Error("No readable text found in this URL.");
      let finalSource = backendSource;
      try {
        const debug = await getSourceDebug(backendSource.id);
        finalSource = sourceFromDebug(debug, { ...source, ...backendSource });
      } catch (debugError) {
        console.warn(debugError);
      }
      data.upsertSource(finalSource, source.id);
      setStatus("success");
      setUrl("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backend ingestion did not complete.";
      setError(message);
      finishSource(source.id, true, {
        processingError: message.includes("No text extracted") ? "No readable text found" : message,
        chunkCount: 0,
        extractedTextLength: 0,
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (!selectedFiles.length) return;
    setIsIngesting(true);
    setError(null);
    setStatus("idle");
    for (const file of selectedFiles) {
      const source = data.addSource({
        name: file.name,
        type: "pdf",
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        status: "processing",
      });
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await apiFetch(API_ROUTES.sourceUpload, { method: "POST", body: form, credentials: "include" });
        const payload = await res.json().catch(() => null);
        if (!res.ok) throw new Error(getUploadErrorMessage(res.status, payload, "Upload failed."));
        const backendSource = normalizeSource({
          ...(payload?.source ?? {}),
          id: payload?.source_id ?? payload?.source?.id,
          chunk_count: payload?.chunk_count ?? payload?.chunks_indexed ?? payload?.source?.chunk_count,
          extracted_text_length: payload?.extracted_text_length ?? payload?.source?.extracted_text_length,
        });
        if (!backendSource.id || (backendSource.chunkCount ?? 0) <= 0) throw new Error("No readable text found in this PDF.");
        let finalSource = backendSource;
        try {
          const debug = await getSourceDebug(backendSource.id);
          finalSource = sourceFromDebug(debug, { ...source, ...backendSource });
        } catch (debugError) {
          console.warn(debugError);
        }
        data.upsertSource(finalSource, source.id);
        setStatus("success");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Backend upload did not complete.";
        setError(message);
        finishSource(source.id, true, {
          processingError: message.includes("No text extracted") || message.includes("No readable text") ? "No readable text found" : message,
          chunkCount: 0,
          extractedTextLength: 0,
        });
      }
    }
    setIsIngesting(false);
    e.target.value = "";
  };

  const handleGenerateQuiz = async (source: Source) => {
    setError(null);
    setBusyAction(`quiz-${source.id}`);
    try {
      const generated = await generateQuizFromSources([source.id], 8, "mixed");
      if (!generated.questions.length) throw new Error("No quiz questions were generated from this source.");
      data.setGeneratedQuizQuestions(generated.questions);
      navigate(`${AppRoute.QUIZ}?sourceId=${encodeURIComponent(source.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateDeck = async (source: Source) => {
    setError(null);
    setBusyAction(`deck-${source.id}`);
    try {
      const generated = await generateDeckFromSources(source.id, 12, "mixed", `${source.name} Deck`);
      if (!generated.cards.length) throw new Error("No flashcards were generated from this source.");
      data.addGeneratedDeck(generated.deck, generated.cards);
      navigate(`${AppRoute.FLASHCARDS}?sourceId=${encodeURIComponent(source.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flashcard generation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Upload" }]}
        title="Build your knowledge base"
        description="Add material and LearnBot prepares it for chat, quizzes, and memory review."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeTab === "pdf" ? "primary" : "soft"} icon={FileUp} onClick={() => setActiveTab("pdf")}>Files</Button>
        <Button variant={activeTab === "url" ? "primary" : "soft"} icon={LinkIcon} onClick={() => setActiveTab("url")}>URL</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-8">
          {activeTab === "pdf" ? (
            <div className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-accent dark:border-indigo-400/20 dark:bg-indigo-400/10">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-primary">Upload documents</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Drop in PDFs and LearnBot will prepare a grounded study workspace.</p>
              </div>
              <input id="file-upload" type="file" multiple accept=".pdf" onChange={handleFileChange} className="hidden" />
              <label htmlFor="file-upload" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(79,70,229,0.85)] transition-all hover:-translate-y-0.5 hover:bg-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15">
                {isIngesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Choose files
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-secondary dark:border-teal-400/20 dark:bg-teal-400/10">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-primary">Sync a web source</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Paste a trusted article, documentation page, or research URL.</p>
              </div>
              <Input placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} />
              <Button onClick={handleUrlIngest} disabled={isIngesting || !url.trim()} icon={isIngesting ? Loader2 : Sparkles}>Sync source</Button>
            </div>
          )}

          {status === "success" && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
              Source saved and ready for study.
            </div>
          )}
          {error && <div className="mt-4"><ErrorState title="Ingestion notice" message={error} embedded /></div>}
          {isIngesting && (
            <div className="mt-6 rounded-2xl border border-default bg-white p-4 dark:bg-white/5">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Preparing source
              </div>
              <div className="space-y-3">
                {processingSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${index === 0 ? "border-indigo-200 bg-indigo-50 text-accent" : "border-default bg-white text-muted dark:bg-white/5"}`}>
                      {index + 1}
                    </span>
                    <span className={index === 0 ? "font-medium text-primary" : "text-muted"}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-primary">Recent sources</h2>
          {data.sources.length === 0 ? (
            <EmptyState title="No sources yet" description="Upload a document to unlock chat, quizzes, and flashcards." action={<Button icon={FileUp} onClick={() => document.getElementById("file-upload")?.click()}>Choose file</Button>} />
          ) : (
            data.sources.slice(0, 5).map((source) => {
              const isReady = source.status === "ready" && (source.chunkCount ?? 0) > 0;
              return (
                <Card key={source.id} className="p-5" interactive>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-accent dark:border-indigo-400/20 dark:bg-indigo-400/10">
                        {source.type === "url" ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-primary">{source.name}</h3>
                        <p className="mt-1 text-sm text-muted">
                          {source.status === "failed" ? source.processingError ?? "Processing failed." : isReady ? "Ready for study tools." : "Preparing study tools."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(source.keyConcepts ?? ["Summary", "Practice", "Memory"]).slice(0, 3).map((concept) => <Badge key={concept} color="gray">{concept}</Badge>)}
                        </div>
                        {source.chunkCount !== undefined && <p className="mt-3 text-xs text-muted">{source.chunkCount} study sections</p>}
                      </div>
                    </div>
                    <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "orange"}>{source.status}</Badge>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button icon={BookOpen} disabled={!isReady}>Study</Button></Link>
                    <Button variant="outline" icon={Target} disabled={!isReady || busyAction === `quiz-${source.id}`} onClick={() => handleGenerateQuiz(source)}>Quiz</Button>
                    <Button variant="outline" icon={Layers3} disabled={!isReady || busyAction === `deck-${source.id}`} onClick={() => handleGenerateDeck(source)}>Flashcards</Button>
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button variant="ghost" icon={MessageSquare}>Ask AI</Button></Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
