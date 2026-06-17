import React, { useMemo, useState } from "react";
import { BookOpen, FileText, Globe, Layers3, MessageSquare, Search, Target, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppRoute } from "../types";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { deleteSource as deleteRemoteSource, generateDeckFromSources, generateQuizFromSources, isBackendSourceId } from "../src/lib/api";

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

  const handleDelete = async (id: string) => {
    setError(null);
    setDeleteNotice(null);
    try {
      if (isBackendSourceId(id)) {
        await deleteRemoteSource(id);
      }
      data.deleteSource(id);
      setDeleteNotice("Source removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete did not complete.");
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
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Sources" }]}
        title="Sources"
        description="Study documents, generate practice, and ask AI from one place."
        action={<Input placeholder="Search sources" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="sm:w-80" />}
      />
      {error && <ErrorState title="Remote sync failed" message={error} />}
      {deleteNotice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {deleteNotice}
        </div>
      )}

      {filteredSources.length === 0 ? (
        <EmptyState
          title={data.sources.length ? "No matching sources" : "No sources yet"}
          icon={Search}
          description={data.sources.length ? "Try another search or upload a new source." : "Upload a document and generate your first study workspace."}
          action={<Link to={AppRoute.UPLOAD}><Button>Upload source</Button></Link>}
        />
      ) : (
        <div className="grid gap-4">
          {filteredSources.map((source) => {
            const isReady = source.status === "ready" && (source.chunkCount ?? 0) > 0;
            const concepts = (source.keyConcepts ?? ["Summary", "Practice", "Memory"]).slice(0, 4);
            return (
              <Card key={source.id} className="p-5" interactive>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-accent dark:border-indigo-400/20 dark:bg-indigo-400/10">
                      {source.type === "url" ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-primary">{source.name}</h2>
                        <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "orange"}>{source.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {isReady ? "Ready for summaries, quizzes, and memory review." : source.processingError ?? "Preparing this source for study."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {concepts.map((concept) => <Badge key={concept} color="gray">{concept}</Badge>)}
                      </div>
                      <p className="mt-4 text-xs text-muted">
                        Added {source.date}{source.size ? ` - ${source.size}` : ""}{source.chunkCount !== undefined ? ` - ${source.chunkCount} study sections` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}>
                      <Button icon={BookOpen} disabled={!isReady}>Study</Button>
                    </Link>
                    <Button variant="outline" icon={Target} disabled={!isReady || busyAction === `quiz-${source.id}`} onClick={() => handleGenerateQuiz(source.id)}>Quiz</Button>
                    <Button variant="outline" icon={Layers3} disabled={!isReady || busyAction === `deck-${source.id}`} onClick={() => handleGenerateDeck(source.id)}>Flashcards</Button>
                    <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}><Button variant="ghost" icon={MessageSquare}>Ask AI</Button></Link>
                    <Button variant="ghost" icon={Trash2} onClick={() => handleDelete(source.id)} aria-label="Delete source" />
                  </div>
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
