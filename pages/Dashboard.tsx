import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, FileText, Sparkles } from "lucide-react";
import { AppRoute, Source, User } from "../types";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { getDueFlashcards } from "../src/logic/learning";

const blackButton =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#050505] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#050505]/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10";
const softButton =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[#D9D1B8] bg-white px-5 text-sm font-semibold text-[#050505] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:bg-[#FFF6B8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10";

const sourceStats = (source?: Source) => ({
  pages: source ? Math.max(1, Math.ceil((source.chunkCount ?? 6) / 3)) : 0,
  topics: source ? source.keyConcepts?.length ?? Math.min(Math.max(source.chunkCount ?? 4, 3), 14) : 0,
});

const NotebookCard = ({ source }: { source: Source }) => {
  const stats = sourceStats(source);
  return (
    <Link
      to={`${AppRoute.CHAT}?sourceId=${encodeURIComponent(source.id)}`}
      className="min-w-[17rem] rounded-[28px] border border-[#D9D1B8] bg-white p-5 shadow-[0_18px_50px_rgba(40,32,20,0.08)] transition hover:-translate-y-1 hover:border-[#E6D979] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#AFC7ED] bg-[#DCEBFF]">
        <FileText className="h-6 w-6 text-[#050505]" />
      </div>
      <h3 className="mt-8 line-clamp-2 text-xl font-black leading-tight tracking-[-0.04em] text-[#050505]">{source.name}</h3>
      <p className="mt-4 text-sm font-semibold text-[#3F3F3A]">{stats.pages} pages - {stats.topics} topics</p>
      <p className="mt-2 text-xs font-medium text-[#6B675F]">Last opened today</p>
    </Link>
  );
};

const Dashboard: React.FC<{ user: User | null }> = ({ user }) => {
  const data = useLearningData();
  const dueCards = useMemo(() => getDueFlashcards(data.flashcards), [data.flashcards]);
  const readySources = data.sources.filter((source) => source.status === "ready");
  const firstName = user?.name?.split(" ")[0] || "there";
  const activeSource = readySources[0] ?? data.sources[0];
  const stats = sourceStats(activeSource);

  return (
    <div className="space-y-10 pb-12">
      <header className="pt-3">
        <h1 className="text-5xl font-black leading-tight tracking-[-0.04em] text-[#050505]">Good afternoon, {firstName}.</h1>
        <p className="mt-3 text-lg font-medium text-[#3F3F3A]">Continue learning from where you left off.</p>
      </header>

      <section className="rounded-[32px] border border-[#AFC7ED] bg-[#DCEBFF] p-7 shadow-[0_18px_50px_rgba(40,32,20,0.08)] md:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div>
            <p className="text-sm font-black text-[#3F3F3A]">Continue Studying</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-[#050505] md:text-6xl">
              {activeSource?.name ?? "Build your first study notebook"}
            </h2>
            <div className="mt-7 flex flex-wrap gap-2 text-sm font-semibold text-[#3F3F3A]">
              <span className="rounded-full border border-[#AFC7ED] bg-white px-4 py-2">Summary completed</span>
              <span className="rounded-full border border-[#AFC7ED] bg-white px-4 py-2">{data.quizQuestions.length ? "Quiz ready" : "Quiz can be generated"}</span>
              <span className="rounded-full border border-[#AFC7ED] bg-white px-4 py-2">{dueCards.length || 7} flashcards due</span>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#D9D1B8] bg-white p-5">
            <p className="text-sm font-black text-[#050505]">Study note</p>
            <p className="mt-3 text-sm leading-6 text-[#3F3F3A]">
              {activeSource ? `${stats.pages} pages and ${stats.topics} topics are ready for grounded explanations and recall practice.` : "Upload one material to start your study loop."}
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={blackButton} to={activeSource ? `${AppRoute.CHAT}?sourceId=${encodeURIComponent(activeSource.id)}` : AppRoute.UPLOAD}>Continue</Link>
          <Link className={softButton} to={activeSource ? `${AppRoute.FLASHCARDS}?sourceId=${encodeURIComponent(activeSource.id)}` : AppRoute.FLASHCARDS}>Review cards</Link>
          <Link className={softButton} to={activeSource ? `${AppRoute.QUIZ}?sourceId=${encodeURIComponent(activeSource.id)}` : AppRoute.QUIZ}>Take quiz</Link>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-[#050505]">Recent Materials</h2>
            <p className="mt-2 text-sm font-medium text-[#3F3F3A]">Notebooks on your study desk.</p>
          </div>
          <Link className="text-sm font-bold text-[#050505] hover:underline" to={AppRoute.SOURCES}>View all</Link>
        </div>
        {data.sources.length ? (
          <div className="flex gap-5 overflow-x-auto pb-3 custom-scrollbar">
            {data.sources.slice(0, 6).map((source) => <NotebookCard key={source.id} source={source} />)}
          </div>
        ) : (
          <div className="rounded-[28px] border border-[#D9D1B8] bg-white p-8 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
            <BookOpen className="h-8 w-8" />
            <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">No materials yet</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#3F3F3A]">Upload notes, PDFs, lecture slides, or study guides to build your first workspace.</p>
            <Link className={`${blackButton} mt-6`} to={AppRoute.UPLOAD}>Upload material</Link>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[32px] border border-[#D9D1B8] bg-white p-7 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
          <h2 className="text-3xl font-black tracking-[-0.04em] text-[#050505]">Today's Study Queue</h2>
          <div className="mt-7 space-y-5">
            {[
              ["Review Lecture 5", activeSource ? "Start with the saved summary and source-grounded notes." : "Upload a lecture to start."],
              ["Practice Quiz", data.quizQuestions.length ? "A question set is ready." : "Generate questions from your active material."],
              ["Memory Review", `${dueCards.length || 7} flashcards are waiting.`],
            ].map(([title, body], index) => (
              <div key={title} className="grid grid-cols-[2rem_1fr] gap-4">
                <div className="flex flex-col items-center">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#D9D1B8] ${index === 0 ? "bg-[#050505] text-white" : "bg-[#FFF6B8] text-[#050505]"}`}>
                    {index === 0 ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  {index < 2 && <span className="h-12 w-px bg-[#D9D1B8]" />}
                </div>
                <div>
                  <p className="text-lg font-black text-[#050505]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#3F3F3A]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#D9D1B8] bg-[#EFE7FF] p-7 shadow-[0_18px_50px_rgba(40,32,20,0.08)]">
          <Sparkles className="h-8 w-8 text-[#050505]" />
          <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-[#050505]">Study Coach</h2>
          <p className="mt-4 text-sm leading-7 text-[#3F3F3A]">
            One source becomes answers, quizzes, and flashcards. Ask LearnBot what to understand first, then turn weak spots into recall.
          </p>
          <Link className={`${blackButton} mt-7`} to={activeSource ? `${AppRoute.CHAT}?sourceId=${encodeURIComponent(activeSource.id)}` : AppRoute.CHAT}>
            Open Study Coach
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
