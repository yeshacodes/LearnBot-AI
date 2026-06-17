import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Badge, Button } from "../components/Common";

const steps = [
  {
    title: "Upload your material",
    description: "Add PDFs, lecture notes, readings, or documentation. LearnBot organizes the source before you study.",
    icon: UploadCloud,
  },
  {
    title: "Ask from context",
    description: "Chat with an assistant that answers from the material you selected, with compact source references.",
    icon: MessageSquare,
  },
  {
    title: "Practice what matters",
    description: "Generate quizzes and flashcards from the same source so understanding turns into recall.",
    icon: Brain,
  },
];

const features = [
  {
    title: "Source-grounded AI chat",
    description: "Ask for summaries, explanations, examples, or study plans without losing connection to the original notes.",
    icon: Sparkles,
  },
  {
    title: "Study tools from one source",
    description: "Move from reading to flashcards and quizzes without rebuilding context in separate apps.",
    icon: Layers,
  },
  {
    title: "A workspace for deep work",
    description: "Focused layouts, calm surfaces, and readable outputs designed for long study sessions.",
    icon: BookOpen,
  },
];

const sourceItems = ["Machine perception notes", "Week 5 lecture PDF", "Exam review guide"];

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="sticky top-0 z-30 border-b border-default bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15"
            aria-label="LearnBot home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8B5CF6,#D97745)] text-white shadow-[0_14px_28px_-18px_rgba(139,92,246,0.78)]">
              <Layers className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">LearnBot</span>
          </button>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex" aria-label="Landing navigation">
            <a className="transition hover:text-primary" href="#how-it-works">How it works</a>
            <a className="transition hover:text-primary" href="#features">Features</a>
            <a className="transition hover:text-primary" href="#product">Product</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button onClick={() => navigate("/auth")}>Get started</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-24">
          <div>
            <Badge color="blue">AI study coach for your notes</Badge>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-tight text-primary md:text-6xl lg:text-7xl">
              Turn your notes into an AI study coach.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              LearnBot helps students upload material, understand difficult concepts, generate practice, and keep studying from one focused workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button className="min-h-12 px-6 text-base" onClick={() => navigate("/auth")}>
                Start studying
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button className="min-h-12 px-6 text-base" variant="outline" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted">
              {["Upload notes", "Ask AI", "Practice recall"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-default bg-card px-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div id="product" className="relative">
            <div className="rounded-[2rem] border border-default bg-card p-3 shadow-[0_30px_90px_-58px_rgba(91,64,43,0.45)]">
              <div className="overflow-hidden rounded-[1.5rem] border border-default bg-[#FAF7F2] dark:bg-white/5">
                <div className="flex items-center justify-between border-b border-default bg-card px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#EFA7C8]" />
                    <span className="h-3 w-3 rounded-full bg-[#D97745]" />
                    <span className="h-3 w-3 rounded-full bg-[#8FAF9C]" />
                  </div>
                  <span className="text-xs font-medium text-muted">LearnBot workspace</span>
                </div>

                <div className="grid min-h-[32rem] lg:grid-cols-[15rem_1fr]">
                  <aside className="border-b border-default bg-card p-4 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sources</p>
                    <div className="mt-4 space-y-2">
                      {sourceItems.map((source, index) => (
                        <div
                          key={source}
                          className={`rounded-xl border p-3 ${index === 1 ? "border-[#D8C6F6] bg-[#F2ECFF] dark:bg-violet-400/10" : "border-default bg-white dark:bg-white/5"}`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-accent" />
                            <p className="truncate text-sm font-medium text-primary">{source}</p>
                          </div>
                          <p className="mt-2 text-xs text-muted">{index === 1 ? "Ready for study" : "Indexed source"}</p>
                        </div>
                      ))}
                    </div>
                  </aside>

                  <div className="p-5">
                    <div className="rounded-2xl border border-default bg-card p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2ECFF] text-accent dark:bg-violet-400/10">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-primary">Study Coach</p>
                          <p className="mt-2 text-sm leading-6 text-muted">
                            Start with the edge detection section, then review the flashcards LearnBot created from your lecture.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-default bg-card p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">AI answer</p>
                        <p className="mt-3 text-sm leading-6 text-primary">
                          Edges mark rapid intensity changes. Corners are points where edge direction changes sharply, making them useful for matching and tracking.
                        </p>
                        <div className="mt-4 rounded-xl bg-[#FAF7F2] p-3 text-xs leading-5 text-muted dark:bg-white/5">
                          Source: Week 5 lecture PDF, section 2
                        </div>
                      </div>
                      <div className="rounded-2xl border border-default bg-card p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Practice queue</p>
                        <div className="mt-4 space-y-3">
                          {["7 cards due", "Short quiz ready", "Weak topic: corner detection"].map((item) => (
                            <div key={item} className="flex items-center gap-3 text-sm text-primary">
                              <span className="h-2 w-2 rounded-full bg-[#8FAF9C]" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-default bg-white/56">
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-accent">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-primary md:text-5xl">
                From source material to study session in minutes.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-default bg-background p-6 transition hover:-translate-y-1 hover:border-[#D8C6F6]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F2ECFF] text-accent dark:bg-violet-400/10">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-sm font-semibold text-muted">Step {index + 1}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-primary">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-accent">Why students come back</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-primary md:text-5xl">
                A study system that stays calm under pressure.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted">
                LearnBot is designed for exam weeks, dense lectures, and long reading lists. It keeps the workflow simple: understand, practice, remember.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-default bg-card p-6 transition hover:-translate-y-1 hover:border-[#D8C6F6]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3ECE3] text-accent dark:bg-white/10">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-primary">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#1F2937] bg-[#111827] p-8 text-white shadow-[0_32px_110px_-58px_rgba(217,119,69,0.42)] md:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-white/70">Ready when your notes are</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                  Build a study coach from the material you already have.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
                  Upload your first source, ask a focused question, and turn the answer into practice.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button className="border-white bg-white text-[#111827] hover:border-white hover:bg-[#FAF7F2]" onClick={() => navigate("/auth")}>
                  Get started
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button className="border-white/20 bg-white/10 text-white hover:bg-white/15" variant="outline" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
