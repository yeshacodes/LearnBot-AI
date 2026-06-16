import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, CalendarCheck, Flame, Layers, MessageSquare, Target, Upload, Zap } from "lucide-react";
import { AppRoute, User } from "../types";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import {
  buildLearningInsights,
  calculateQuizAccuracy,
  calculateReviewStreak,
  detectWeakTopics,
  generateTodayStudyPlan,
  getDueFlashcards,
  getRecentActivity,
  recommendNextAction,
} from "../src/logic/learning";

const Dashboard: React.FC<{ user: User | null }> = ({ user }) => {
  const data = useLearningData();
  const dueCards = useMemo(() => getDueFlashcards(data.flashcards), [data.flashcards]);
  const accuracy = useMemo(() => calculateQuizAccuracy(data.quizAttempts), [data.quizAttempts]);
  const weakTopics = useMemo(
    () => detectWeakTopics(data.quizAttempts, data.quizQuestions),
    [data.quizAttempts, data.quizQuestions],
  );
  const todayPlan = useMemo(
    () => generateTodayStudyPlan({ sources: data.sources, dueCards, weakTopics, goals: data.studyGoals }),
    [data.sources, dueCards, weakTopics, data.studyGoals],
  );
  const nextAction = useMemo(
    () => recommendNextAction({ sources: data.sources, dueCards, weakTopics, accuracy, chatSessions: data.chatSessions }),
    [data.sources, dueCards, weakTopics, accuracy, data.chatSessions],
  );
  const insights = useMemo(
    () => buildLearningInsights({ attempts: data.quizAttempts, dueCards, weakTopics, accuracy }),
    [data.quizAttempts, dueCards, weakTopics, accuracy],
  );
  const reviewStreak = useMemo(
    () => calculateReviewStreak(data.flashcardReviews.map((review) => review.reviewedAt)),
    [data.flashcardReviews],
  );
  const recentActivity = useMemo(
    () =>
      getRecentActivity({
        sources: data.sources,
        attempts: data.quizAttempts,
        reviews: data.flashcardReviews,
        chats: data.chatSessions,
      }),
    [data.sources, data.quizAttempts, data.flashcardReviews, data.chatSessions],
  );
  const firstName = user?.name?.split(" ")[0] || "there";
  const latestSource = data.sources[0];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Dashboard" }]}
        eyebrow="Dashboard"
        title={`Good to see you, ${firstName}`}
        description="Your workspace reflects saved sources, chat history, quiz attempts, and review timing."
        action={
          <Link to={AppRoute.CHAT}>
            <Button icon={MessageSquare}>Ask AI</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Review streak" value={`${reviewStreak} day${reviewStreak === 1 ? "" : "s"}`} detail="Based on flashcard reviews" icon={Flame} accent="orange" />
        <StatCard title="Quiz accuracy" value={`${accuracy || 0}%`} detail={`${data.quizAttempts.length} completed attempts`} icon={Target} accent="green" />
        <StatCard title="Due today" value={String(dueCards.length)} detail="Flashcards ready for review" icon={Brain} accent="purple" />
        <StatCard title="Sources" value={String(data.sources.length)} detail={`${data.sources.filter((source) => source.status === "ready").length} ready`} icon={BookOpen} accent="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">Continue learning</h2>
              <p className="mt-1 text-sm font-medium text-muted">
                {latestSource ? latestSource.name : "Upload a source to begin"}
              </p>
            </div>
            <Badge color={latestSource?.status === "ready" ? "green" : latestSource?.status === "failed" ? "red" : "orange"}>
              {latestSource?.status ?? "empty"}
            </Badge>
          </div>
          {latestSource ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Link to={AppRoute.CHAT} className="rounded-3xl bg-surface2 p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25">
                <MessageSquare className="mb-4 h-6 w-6 text-accent" />
                <p className="font-bold text-primary">Ask about it</p>
                <p className="mt-1 text-sm text-muted">Use selected source context.</p>
              </Link>
              <Link to={AppRoute.QUIZ} className="rounded-3xl bg-surface2 p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25">
                <Target className="mb-4 h-6 w-6 text-accent" />
                <p className="font-bold text-primary">Take a quiz</p>
                <p className="mt-1 text-sm text-muted">Practice weak concepts.</p>
              </Link>
              <Link to={AppRoute.FLASHCARDS} className="rounded-3xl bg-surface2 p-5 transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25">
                <Layers className="mb-4 h-6 w-6 text-accent" />
                <p className="font-bold text-primary">Review cards</p>
                <p className="mt-1 text-sm text-muted">Use spaced repetition.</p>
              </Link>
            </div>
          ) : (
            <EmptyState title="No learning source yet" action={<Link to={AppRoute.UPLOAD}><Button icon={Upload}>Upload source</Button></Link>} embedded />
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-bold text-primary">Today's study plan</h2>
          </div>
          <div className="mt-5 space-y-3">
            {todayPlan.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-surface2 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold leading-6 text-primary">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-2xl font-bold text-primary">Learning insights</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {insights.length ? (
              insights.map((insight) => (
                <div key={insight.id} className="rounded-3xl bg-surface2 p-5">
                  <Badge color={insight.severity === "warning" ? "orange" : insight.severity === "success" ? "green" : "purple"}>
                    {insight.severity}
                  </Badge>
                  <h3 className="mt-4 font-bold text-primary">{insight.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted">{insight.body}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No insights yet" description="Take a quiz or review flashcards to generate learning signals." embedded />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-bold text-primary">Recommended next action</h2>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-muted">{nextAction}</p>
          <div className="mt-6 grid gap-3">
            <Link to={AppRoute.UPLOAD}><Button variant="soft" className="w-full justify-start" icon={Upload}>Upload</Button></Link>
            <Link to={AppRoute.QUIZ}><Button variant="soft" className="w-full justify-start" icon={Target}>Quiz</Button></Link>
            <Link to={AppRoute.FLASHCARDS}><Button variant="soft" className="w-full justify-start" icon={Brain}>Flashcards</Button></Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-primary">Recent activity</h2>
          <div className="mt-5 space-y-3">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 rounded-2xl bg-surface2 p-4">
                  <div>
                    <p className="text-sm font-bold text-primary">{activity.label}</p>
                    <p className="mt-1 text-sm font-medium text-muted">{activity.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-muted">{new Date(activity.date).toLocaleDateString()}</span>
                </div>
              ))
            ) : (
              <EmptyState title="No activity yet" description="Upload, chat, quiz, or review cards to build your learning timeline." embedded />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold text-primary">Upcoming flashcards</h2>
          <div className="mt-5 space-y-3">
            {dueCards.length ? (
              dueCards.slice(0, 4).map((card) => (
                <div key={card.id} className="rounded-2xl bg-surface2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-bold text-primary">{card.question}</p>
                    <Badge color={(card.masteryScore ?? 0) > 70 ? "green" : "orange"}>{card.masteryScore ?? 0}%</Badge>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-muted">Due {card.nextReviewDate ? new Date(card.nextReviewDate).toLocaleDateString() : "today"}</p>
                </div>
              ))
            ) : (
              <EmptyState title="No cards due" description="You are clear for now. Generate or review a deck when you want a new memory session." action={<Link to={AppRoute.FLASHCARDS}><Button variant="soft" icon={Brain}>Open flashcards</Button></Link>} embedded />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-2xl font-bold text-primary">Weak topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {weakTopics.length ? weakTopics.map((topic) => <Badge key={topic} color="orange">{topic}</Badge>) : <span className="text-sm font-medium text-muted">No weak topics detected yet. Complete a quiz to generate topic-level signals.</span>}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
