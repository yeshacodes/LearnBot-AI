import React, { useMemo, useState } from "react";
import { BookOpen, FileText, Globe, Layers3, MessageSquare, Search, Target, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppRoute } from "../types";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { deleteSource as deleteRemoteSource, generateDeckFromSources, generateQuizFromSources, getApiBase, isBackendSourceId } from "../src/lib/api";

const Sources: React.FC = () => {
  const data = useLearningData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const filteredSources = useMemo(
    () => data.sources.filter((source) => source.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [data.sources, searchTerm],
  );
  const failedZeroSources = useMemo(
    () => data.sources.filter((source) => source.status === "failed" && (source.chunkCount ?? 0) <= 0),
    [data.sources],
  );

  const devApiHint = import.meta.env.DEV ? ` API: ${getApiBase() || "not configured"}` : "";

  const handleDelete = async (id: string) => {
    setError(null);
    setDeleteNotice(null);
    const source = data.sources.find((item) => item.id === id);
    if (!source) return;
    const confirmed = window.confirm(`Remove "${source.name}" from Sources?`);
    if (!confirmed) return;

    try {
      if (isBackendSourceId(id)) {
        await deleteRemoteSource(id);
      }
      data.deleteSource(id);
      setDeleteNotice("Source removed.");
    } catch (err) {
      data.deleteSource(id);
      setDeleteNotice("Source removed from this device.");
      const message = err instanceof Error ? err.message : "Delete could not be confirmed.";
      setError(`The source was removed locally, but the backend delete could not be confirmed. ${message}${devApiHint}`);
    }
  };

  const handleClearFailedSources = async () => {
    if (!failedZeroSources.length) return;
    const confirmed = window.confirm(`Clear ${failedZeroSources.length} failed source${failedZeroSources.length === 1 ? "" : "s"} with no study sections?`);
    if (!confirmed) return;

    setError(null);
    setDeleteNotice(null);
    setBusyAction("clear-failed");
    const failures: string[] = [];

    for (const source of failedZeroSources) {
      try {
        if (isBackendSourceId(source.id)) {
          await deleteRemoteSource(source.id);
        }
      } catch (err) {
        failures.push(err instanceof Error ? err.message : `Could not confirm delete for ${source.name}.`);
      } finally {
        data.deleteSource(source.id);
      }
    }

    setBusyAction(null);
    setDeleteNotice(`Cleared ${failedZeroSources.length} failed source${failedZeroSources.length === 1 ? "" : "s"}.`);
    if (failures.length) {
      setError(`Some backend deletes could not be confirmed, but the failed sources were removed locally. ${failures[0]}${devApiHint}`);
    }
  };

  const handleGenerateQuiz = async (sourceId: string) => {
    setError(null);
    setBusyAction(`quiz-${sourceId}`);
    try {
      const generated = await generateQuizFromSources([sourceId], 8, "mixed");
      if (!generated.questions.length) throw new Error("No quiz questions were generated from this source.");
      data.setGeneratedQuizQuestions(generated.questions);
      navigate(`${AppRoute.QUIZ}?sourceId=${encodeURIComponent(sourceId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateDeck = async (sourceId: string) => {
    const source = data.sources.find((item) => item.id === sourceId);
    setError(null);
    setBusyAction(`deck-${sourceId}`);
    try {
      const generated = await generateDeckFromSources(sourceId, 12, "mixed", source ? `${source.name} Deck` : undefined);
      if (!generated.cards.length) throw new Error("No flashcards were generated from this source.");
      data.addGeneratedDeck(generated.deck, generated.cards);
      navigate(`${AppRoute.FLASHCARDS}?sourceId=${encodeURIComponent(sourceId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flashcard generation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Study desk", href: "/app/dashboard" }, { label: "Materials" }]}
        title="Your material library."
        description="A calm shelf for every source LearnBot can use to answer, quiz, and help you remember."
        action={<Link to={AppRoute.UPLOAD}><Button>Upload source</Button></Link>}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="max-w-xl">
          <Input placeholder="Search materials" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        {failedZeroSources.length > 0 && (
          <Button variant="outline" icon={Trash2} disabled={busyAction === "clear-failed"} onClick={handleClearFailedSources}>
            Clear failed sources
          </Button>
        )}
      </section>

      {error && <ErrorState title="Remote sync note" message={error} />}
      {deleteNotice && (
        <div className="rounded-[24px] border border-[#BFD0C0] bg-[#EEF4ED] p-4 text-sm font-bold text-primary">
          {deleteNotice}
        </div>
      )}

      {filteredSources.length === 0 ? (
        <EmptyState
          title={data.sources.length ? "No matching materials" : "No materials yet"}
          icon={Search}
          description={data.sources.length ? "Try another search or upload a new source." : "Upload one document and LearnBot will prepare it for grounded study."}
          action={<Link to={AppRoute.UPLOAD}><Button>Upload source</Button></Link>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredSources.map((source) => {
            const isReady = source.status === "ready" && (source.chunkCount ?? 0) > 0;
            const concepts = (source.keyConcepts ?? ["Summary", "Practice", "Memory"]).slice(0, 4);
            const pages = Math.max(1, Math.round((source.chunkCount ?? 6) / 3));
            const palette = "bg-white border-[#D9D1B8]";
            return (
              <Card key={source.id} className={`flex min-h-[22rem] flex-col justify-between ${palette} p-6`} interactive>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#D9D1B8] bg-white">
                      {source.type === "url" ? <Globe className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    </div>
                    <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "orange"}>{source.status}</Badge>
                  </div>

                  <h2 className="mt-7 line-clamp-2 text-3xl font-black leading-tight tracking-[-0.04em] text-primary">{source.name}</h2>
                  <p className="mt-4 text-sm font-medium leading-6 text-[#3F3F3A]">
                    {isReady ? "Ready for source-grounded study." : source.processingError ?? "Preparing this source for your study desk."}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-[18px] border border-[#D9D1B8] bg-white p-3">
                      <p className="text-xl font-black text-primary">{pages}</p>
                      <p className="text-xs font-bold text-[#6B675F]">pages est.</p>
                    </div>
                    <div className="rounded-[18px] border border-[#D9D1B8] bg-white p-3">
                      <p className="text-xl font-black text-primary">{concepts.length}</p>
                      <p className="text-xs font-bold text-[#6B675F]">concepts</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {concepts.map((concept) => <Badge key={concept} color="gray">{concept}</Badge>)}
                  </div>
                  <p className="mt-4 text-xs font-semibold text-[#6B675F]">
                    Added {source.date}{source.size ? ` · ${source.size}` : ""}{source.chunkCount !== undefined ? ` · ${source.chunkCount} sections` : ""}
                  </p>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}>
                    <Button icon={BookOpen} disabled={!isReady}>Study</Button>
                  </Link>
                  <Button variant="outline" icon={Target} disabled={!isReady || busyAction === `quiz-${source.id}`} onClick={() => handleGenerateQuiz(source.id)}>Quiz</Button>
                  <Button variant="outline" icon={Layers3} disabled={!isReady || busyAction === `deck-${source.id}`} onClick={() => handleGenerateDeck(source.id)}>Cards</Button>
                  <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button variant="ghost" icon={MessageSquare}>Ask</Button></Link>
                  <Button variant="ghost" icon={Trash2} onClick={() => handleDelete(source.id)} aria-label={`Delete ${source.name}`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sources;
