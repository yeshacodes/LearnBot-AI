import React, { useState } from "react";
import { BookOpen, CheckCircle2, FileText, FileUp, Globe, Layers3, Loader2, MessageSquare, Sparkles, Target, UploadCloud } from "lucide-react";
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
    <div className="space-y-12 pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Study desk", href: "/app/dashboard" }, { label: "Upload" }]}
        title="Add material to your desk."
        description="Upload one source and LearnBot turns it into grounded answers, quiz practice, and memory review."
      />

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <Card className="relative overflow-hidden bg-[#FFF6B8] p-6 md:p-9">
          <div className="pointer-events-none absolute right-10 top-8 grid grid-cols-3 gap-2 opacity-80" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => <span key={index} className="h-2.5 w-2.5 rounded-full bg-[#050505]" />)}
          </div>

          <div className="relative max-w-3xl">
            <div className="mb-7 inline-flex rounded-full border border-[#D9D1B8] bg-white p-1">
              <button
                type="button"
                onClick={() => setActiveTab("pdf")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${activeTab === "pdf" ? "bg-[#050505] text-white" : "text-primary hover:bg-[#050505]/[0.04]"}`}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${activeTab === "url" ? "bg-[#050505] text-white" : "text-primary hover:bg-[#050505]/[0.04]"}`}
              >
                URL
              </button>
            </div>

            <input id="file-upload" type="file" multiple accept=".pdf" onChange={handleFileChange} className="hidden" />
            {activeTab === "pdf" ? (
              <label
                htmlFor="file-upload"
                className="group flex min-h-[25rem] cursor-pointer flex-col justify-between rounded-[32px] border border-dashed border-[#E6D979] bg-white p-8 transition hover:-translate-y-1 hover:border-[#8F806F]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#AFC7ED] bg-[#DCEBFF]">
                    {isIngesting ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
                  </div>
                  <span className="rounded-full border border-[#D9D1B8] bg-[#FFF6B8] px-4 py-2 text-xs font-bold text-[#3F3F3A]">
                    PDF, lecture slides, reading notes
                  </span>
                </div>
                <div>
                  <h2 className="max-w-xl text-5xl font-black tracking-[-0.04em] text-primary md:text-6xl">Drop your source here.</h2>
                <p className="mt-5 max-w-lg text-lg font-medium leading-8 text-[#3F3F3A]">
                    LearnBot extracts the text, finds the important concepts, and prepares study tools from the exact material you upload.
                  </p>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-[#050505] px-6 py-3 text-sm font-bold text-white transition group-hover:scale-[1.02]">
                    Choose files
                  </span>
                </div>
              </label>
            ) : (
              <div className="min-h-[25rem] rounded-[32px] border border-[#D9D1B8] bg-white p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#AFC7ED] bg-[#DCEBFF]">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 className="mt-12 max-w-xl text-5xl font-black tracking-[-0.04em] text-primary md:text-6xl">Bring in a web reading.</h2>
                <p className="mt-5 max-w-lg text-lg font-medium leading-8 text-[#3F3F3A]">Paste a trusted article or documentation page and keep it connected to your study workflow.</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Input placeholder="https://example.com/article" value={url} onChange={(event) => setUrl(event.target.value)} />
                  <Button onClick={handleUrlIngest} disabled={isIngesting || !url.trim()} icon={isIngesting ? Loader2 : Sparkles}>Sync</Button>
                </div>
              </div>
            )}
          </div>

          {status === "success" && (
            <div className="relative mt-6 flex items-center gap-3 rounded-[24px] border border-[#BFD0C0] bg-[#EEF4ED] p-4 text-sm font-bold text-primary">
              <CheckCircle2 className="h-5 w-5" />
              Source saved and ready for study.
            </div>
          )}
          {error && <div className="relative mt-4"><ErrorState title="Upload note" message={error} embedded /></div>}
        </Card>

        <Card className="bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050505] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-[-0.02em] text-primary">Processing path</h2>
              <p className="text-sm font-medium text-[#3F3F3A]">From source to study desk.</p>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {processingSteps.map((step, index) => {
              const active = isIngesting && index === 0;
              const complete = status === "success";
              return (
                <div key={step} className="flex gap-4 rounded-[22px] border border-[#D9D1B8] bg-white p-4">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D9D1B8] text-xs font-black ${complete ? "bg-[#EEF4ED]" : active ? "bg-[#050505] text-white" : "bg-[#FFF6B8]"}`}>
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-primary">{step}</p>
                    <p className="mt-1 text-sm font-medium text-[#3F3F3A]">
                      {index === 0 ? "Readable text becomes study sections." : index === 1 ? "Important terms become context." : index === 2 ? "Quiz and recall paths are prepared." : "You can study with context."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.03em] text-primary">Recent materials</h2>
            <p className="mt-2 text-sm font-medium text-[#3F3F3A]">Your newest sources, ready to become answers, quizzes, and flashcards.</p>
          </div>
          <Link to={AppRoute.SOURCES}><Button variant="outline">View all</Button></Link>
        </div>

        {data.sources.length === 0 ? (
          <EmptyState title="No sources yet" description="Upload a document to unlock grounded chat, quizzes, and flashcards." action={<Button icon={FileUp} onClick={() => document.getElementById("file-upload")?.click()}>Choose file</Button>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.sources.slice(0, 6).map((source) => {
              const isReady = source.status === "ready" && (source.chunkCount ?? 0) > 0;
              const concepts = (source.keyConcepts ?? ["Summary", "Practice", "Memory"]).slice(0, 3);
              return (
                <Card key={source.id} className="flex min-h-[18rem] flex-col justify-between bg-white p-5" interactive>
                  <div>
                    <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#AFC7ED] bg-[#DCEBFF]">
                        {source.type === "url" ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "orange"}>{source.status}</Badge>
                    </div>
                    <h3 className="mt-6 line-clamp-2 text-2xl font-black tracking-[-0.03em] text-primary">{source.name}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[#3F3F3A]">
                      {source.status === "failed" ? source.processingError ?? "Processing failed." : isReady ? "Ready for grounded study." : "Preparing study tools."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {concepts.map((concept) => <Badge key={concept} color="gray">{concept}</Badge>)}
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button icon={BookOpen} disabled={!isReady}>Study</Button></Link>
                    <Button variant="outline" icon={Target} disabled={!isReady || busyAction === `quiz-${source.id}`} onClick={() => handleGenerateQuiz(source)}>Quiz</Button>
                    <Button variant="outline" icon={Layers3} disabled={!isReady || busyAction === `deck-${source.id}`} onClick={() => handleGenerateDeck(source)}>Cards</Button>
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button variant="ghost" icon={MessageSquare}>Ask</Button></Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Upload;
