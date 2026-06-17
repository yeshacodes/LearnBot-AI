import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Brain, FileText, Layers3, MessageSquare, Sparkles, Upload } from "lucide-react";
import { AppRoute, User } from "../types";
import { Badge, Button, Card, EmptyState, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { calculateQuizAccuracy, detectWeakTopics, getDueFlashcards } from "../src/logic/learning";

const Dashboard: React.FC<{ user: User | null }> = ({ user }) => {
  const data = useLearningData();
  const dueCards = useMemo(() => getDueFlashcards(data.flashcards), [data.flashcards]);
  const accuracy = useMemo(() => calculateQuizAccuracy(data.quizAttempts), [data.quizAttempts]);
  const weakTopics = useMemo(() => detectWeakTopics(data.quizAttempts, data.quizQuestions), [data.quizAttempts, data.quizQuestions]);
  const readySources = data.sources.filter((source) => source.status === "ready");
  const firstName = user?.name?.split(" ")[0] || "there";
  const activeSource = readySources[0] ?? data.sources[0];
  const activeDeck = activeSource ? data.flashcardDecks.find((deck) => deck.sourceId === activeSource.id) : data.flashcardDecks[0];
  const hasActivity = data.quizAttempts.length + data.flashcardReviews.length + data.chatSessions.length >= 3;
  const progress = activeDeck?.cardIds.length
    ? Math.round((activeDeck.cardIds.filter((id) => (data.flashcards.find((card) => card.id === id)?.masteryScore ?? 0) >= 60).length / activeDeck.cardIds.length) * 100)
    : activeSource?.status === "ready"
      ? 35
      : 0;
  const coachMessage = dueCards.length
    ? `${activeDeck?.name ?? "Your memory deck"} has ${dueCards.length} card${dueCards.length === 1 ? "" : "s"} due. Start with flashcards, then take a short quiz.`
    : weakTopics[0]
      ? `${weakTopics[0]} is the weakest topic right now. Ask LearnBot for a quick explanation, then practice it.`
      : activeSource
        ? `${activeSource.name} is ready. Ask AI for a summary, then turn it into practice.`
        : "Upload one document to start a grounded learning path.";
  const coachAction = dueCards.length ? AppRoute.FLASHCARDS : weakTopics[0] ? AppRoute.CHAT : activeSource ? AppRoute.CHAT : AppRoute.UPLOAD;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Dashboard" }]}
        title={`Good to see you, ${firstName}`}
        description="Upload material, understand it, practice it, and remember it."
        action={<Link to={AppRoute.UPLOAD}><Button icon={Upload}>Upload document</Button></Link>}
      />

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="pastel-sheen overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,244,251,0.96)_48%,rgba(245,239,255,0.96))] p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted">Continue Learning</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-primary md:text-4xl">
                {activeSource ? activeSource.name : "Start with your first document"}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                {activeSource
                  ? "Your current document is ready for summaries, quizzes, and memory review."
                  : "Upload a PDF or URL and LearnBot will create a grounded study workspace around it."}
              </p>
            </div>
            <Badge color={activeSource?.status === "ready" ? "green" : activeSource?.status === "failed" ? "red" : "gray"}>
              {activeSource?.status ?? "no source"}
            </Badge>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-muted">Learning progress</span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-md border border-fuchsia-100 bg-white/75 px-2 py-1">{dueCards.length} cards due today</span>
              <span className="rounded-md border border-violet-100 bg-white/75 px-2 py-1">{data.quizQuestions.length ? "Quiz available" : "Quiz can be generated"}</span>
            </div>
          </div>

          {activeSource ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(activeSource.id)}`}><Button icon={ArrowRight}>Resume Studying</Button></Link>
              <Link to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(activeSource.id)}`}><Button variant="outline" icon={MessageSquare}>Ask AI</Button></Link>
              <Link to={`${AppRoute.FLASHCARDS}?sourceId=${encodeURIComponent(activeSource.id)}`}><Button variant="outline" icon={Layers3}>Review cards</Button></Link>
              <Link to={`${AppRoute.QUIZ}?sourceId=${encodeURIComponent(activeSource.id)}`}><Button variant="outline" icon={Brain}>Take quiz</Button></Link>
            </div>
          ) : (
            <div className="mt-8"><Link to={AppRoute.UPLOAD}><Button icon={Upload}>Upload document</Button></Link></div>
          )}
        </Card>

        <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(255,241,249,0.92))] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-fuchsia-100 bg-gradient-to-br from-pink-50 to-violet-50 text-accent">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-muted">AI Study Coach</p>
          </div>
          <p className="mt-5 text-lg font-medium leading-7 text-primary">{coachMessage}</p>
          {weakTopics[0] && <p className="mt-3 text-sm text-muted">Weakest topic: <span className="font-medium text-primary">{weakTopics[0]}</span></p>}
          {hasActivity && (
            <p className="mt-3 text-sm text-muted">Quiz accuracy: <span className="font-medium text-primary">{accuracy}%</span></p>
          )}
          <Link to={coachAction} className="mt-6 inline-flex"><Button variant="outline" icon={ArrowRight}>Start</Button></Link>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">Recent Documents</h2>
              <p className="mt-1 text-sm text-muted">Your latest study sources.</p>
            </div>
            <Link to={AppRoute.SOURCES} className="text-sm font-medium text-muted hover:text-primary">View all</Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.sources.length ? (
              data.sources.slice(0, 4).map((source) => (
                <Link
                  key={source.id}
                  to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border border-default bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-pink-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-50 to-violet-50 text-accent">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">{source.name}</p>
                      <p className="mt-1 text-xs text-muted">{(source.keyConcepts ?? []).slice(0, 2).join(", ") || `${source.chunkCount ?? 0} study sections`}</p>
                    </div>
                  </div>
                  <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "gray"}>{source.status}</Badge>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No documents yet"
                description="Upload a document and generate your first study deck."
                action={<Link to={AppRoute.UPLOAD}><Button icon={Upload}>Upload Document</Button></Link>}
                icon={BookOpen}
                embedded
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">Upcoming Reviews</h2>
              <p className="mt-1 text-sm text-muted">Cards ready for spaced repetition.</p>
            </div>
            <Link to={AppRoute.FLASHCARDS} className="text-sm font-medium text-muted hover:text-primary">Open</Link>
          </div>
          <div className="mt-5 space-y-3">
            {dueCards.length ? (
              dueCards.slice(0, 4).map((card) => (
                <Link
                  key={card.id}
                  to={AppRoute.FLASHCARDS}
                  className="block rounded-xl border border-default bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-pink-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-6 text-primary">{card.question}</p>
                  <p className="mt-2 text-xs text-muted">{card.masteryScore ?? 0}% mastery - {card.reviewCount ?? 0} reviews</p>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No cards due"
                description="You are caught up. Generate cards from a document when you want more practice."
                action={<Link to={AppRoute.FLASHCARDS}><Button variant="outline" icon={Brain}>Open Flashcards</Button></Link>}
                icon={Brain}
                embedded
              />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
};

export default Dashboard;
