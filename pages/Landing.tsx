import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Brain, CheckCircle2, FileText, Layers, Menu, MessageSquare, Sparkles, UploadCloud, X } from "lucide-react";
import { Button } from "../components/Common";

const steps = [
  {
    label: "Step 01",
    title: "Upload your notes",
    description: "Add PDFs, lecture slides, readings, or study guides. LearnBot prepares the source for grounded AI help.",
    icon: UploadCloud,
  },
  {
    label: "Step 02",
    title: "Study with context",
    description: "Ask questions, request summaries, and clarify confusing sections from the exact material you selected.",
    icon: MessageSquare,
  },
  {
    label: "Step 03",
    title: "Practice what matters",
    description: "Generate quizzes and flashcards from the same source, then review until the ideas stay with you.",
    icon: Brain,
  },
];

const features = [
  {
    kicker: "01 AI Tutor",
    title: "Ask better questions from your actual material",
    description: "Study from your material, not generic AI answers. Every response stays tied to the lecture, reading, or guide you selected.",
    icon: Sparkles,
  },
  {
    kicker: "02 Recall",
    title: "Turn readings into practice sessions",
    description: "One source. Answers, quizzes, and flashcards. LearnBot turns understanding into the next concrete review step.",
    icon: Layers,
  },
];

const studyActions = ["Summarize", "Explain", "Quiz me", "Make flashcards"];
const navItems = [
  { label: "Home", href: "#hero", active: true },
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
];
const blackButtonClasses =
  "!rounded-full !border-black !bg-black !text-white !shadow-none hover:!scale-[1.02] hover:!border-black hover:!bg-black/85 focus-visible:!ring-black/20";

const DotV = ({ className = "" }: { className?: string }) => {
  const dots = [
    "left-0 top-0",
    "left-5 top-5",
    "left-10 top-10",
    "left-[3.75rem] top-[3.75rem]",
    "left-20 top-20",
    "left-[6.25rem] top-[3.75rem]",
    "left-30 top-10",
    "left-35 top-5",
    "left-40 top-0",
  ];

  return (
    <div className={`relative h-24 w-48 ${className}`} aria-hidden="true">
      {dots.map((position) => (
        <span key={position} className={`absolute h-4 w-4 rounded-full bg-black ${position}`} />
      ))}
    </div>
  );
};

const DotCluster = ({ className = "" }: { className?: string }) => (
  <div className={`grid w-24 grid-cols-3 gap-2 ${className}`} aria-hidden="true">
    {Array.from({ length: 9 }).map((_, index) => (
      <span key={index} className="h-4 w-4 rounded-full bg-black" />
    ))}
  </div>
);

const StatusPill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-[#D8D4CC] bg-white/75 px-3 py-1 text-xs font-semibold text-black/70">
    {children}
  </span>
);

const AiTutorPreview = () => (
  <div className="landing-float mt-10 rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF] p-4 shadow-[0_22px_60px_-42px_rgba(31,27,45,0.28)]">
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill>Lecture 5 PDF</StatusPill>
      <StatusPill>Ready</StatusPill>
    </div>

    <div className="mt-5 rounded-[1.15rem] border border-[#D8D4CC] bg-white p-4">
      <p className="text-sm font-bold text-black">Explain edge detection with an example.</p>
    </div>

    <div className="mt-3 rounded-[1.15rem] border border-[#D8D4CC] bg-white/80 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-black">
        <Sparkles className="h-4 w-4" />
        Grounded answer
      </div>
      <p className="text-sm leading-6 text-black/70">
        Edge detection finds sharp brightness changes, like the outline of a road sign in an image. Filters estimate where pixels shift quickly, then mark those boundaries for later vision tasks.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D8D4CC] bg-[#FFF8A8]/70 px-3 py-1 text-xs font-semibold text-black/70">
        <FileText className="h-3.5 w-3.5" />
        Source: Edge operators, p. 12
      </div>
    </div>
  </div>
);

const RecallPreview = () => (
  <div className="landing-float mt-10 rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF] p-4 shadow-[0_22px_60px_-42px_rgba(31,27,45,0.28)] [animation-delay:900ms]">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[1rem] border border-[#D8D4CC] bg-white p-4">
        <p className="text-2xl font-black tracking-[-0.04em]">24</p>
        <p className="mt-1 text-sm font-semibold text-black/65">Flashcards created</p>
      </div>
      <div className="rounded-[1rem] border border-[#D8D4CC] bg-white p-4">
        <p className="text-2xl font-black tracking-[-0.04em]">12</p>
        <p className="mt-1 text-sm font-semibold text-black/65">Questions generated</p>
      </div>
    </div>

    <div className="mt-3 rounded-[1.15rem] border border-[#D8D4CC] bg-white/85 p-4">
      <p className="text-sm font-bold">Review queue</p>
      <div className="mt-3 space-y-2.5">
        {["7 cards due today", "Weak topic: Hough transform", "Next quiz: Edge detection"].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-full border border-[#D8D4CC] bg-[#FAF7F2] px-3 py-2 text-sm font-semibold text-black/70">
            <CheckCircle2 className="h-4 w-4 text-black" />
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToAuth = () => {
    setMobileMenuOpen(false);
    navigate("/auth");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#FFFEEF] text-black">
      <header className="absolute left-0 right-0 top-0 z-30">
        <div className="mx-auto grid max-w-[112rem] grid-cols-[1fr_auto] items-center gap-4 px-5 py-6 md:grid-cols-[1fr_auto_1fr] md:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="justify-self-start rounded-md text-xl font-black tracking-[-0.04em] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15 md:text-2xl"
            aria-label="LearnBot home"
          >
            <span className="relative inline-block">
              LearnBot
              <span className="absolute left-0 top-[52%] h-[3px] w-full bg-black" />
            </span>
          </button>

          <nav className="hidden items-center gap-2 rounded-full bg-black px-3 py-2 text-sm font-semibold text-[#FFFEEF] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.8)] md:flex" aria-label="Landing navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                className={`relative rounded-full px-4 py-2 transition hover:text-[#FFF8A8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20 ${
                  item.active ? "text-white after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-[#FFF8A8]" : ""
                }`}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              className="rounded-full px-4 py-2 text-[#FFFEEF] transition hover:text-[#FFF8A8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20"
              onClick={goToAuth}
            >
              Sign In
            </button>
            <button
              type="button"
              className="rounded-full bg-[#8B5CF6] px-5 py-2 text-white shadow-[0_10px_24px_-18px_rgba(139,92,246,0.75)] transition hover:scale-[1.02] hover:bg-[#7C3AED] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/30"
              onClick={goToAuth}
            >
              Get Started
            </button>
          </nav>

          <div className="hidden md:block" />

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-full bg-black text-[#FFFEEF] transition hover:scale-[1.02] hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mx-5 rounded-[1.5rem] bg-black p-3 text-[#FFFEEF] shadow-[0_22px_50px_-34px_rgba(0,0,0,0.72)] md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-semibold" aria-label="Mobile landing navigation">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  className={`relative rounded-full px-4 py-3 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20 ${
                    item.active ? "bg-white/10 text-white after:absolute after:bottom-2 after:left-4 after:h-0.5 after:w-5 after:rounded-full after:bg-[#FFF8A8]" : ""
                  }`}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                className="rounded-full px-4 py-3 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20"
                onClick={goToAuth}
              >
                Sign In
              </button>
              <button
                type="button"
                className="mt-1 rounded-full bg-[#8B5CF6] px-4 py-3 text-left font-bold text-white transition hover:bg-[#7C3AED] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/30"
                onClick={goToAuth}
              >
                Get Started
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>
        <section id="hero" className="relative min-h-[48rem] px-5 pb-16 pt-32 md:px-8 md:pt-40 lg:px-12 lg:pt-52">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_43%_72%,#FFF79A_0%,rgba(255,247,154,0.72)_24%,rgba(255,254,239,0.92)_52%,#FFFFFF_100%)]" />
          <div className="mx-auto max-w-[112rem]">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start">
              <div>
                <h1 className="max-w-[72rem] text-5xl font-black leading-[0.96] tracking-[-0.04em] text-black md:text-7xl lg:text-[5.75rem]">
                  <span className="block">Turn your notes into</span>
                  <span className="block">an AI study coach.</span>
                </h1>
              </div>
              <div className="pt-2 lg:pt-7">
                <p className="max-w-[27rem] text-xl font-medium leading-tight tracking-[-0.035em] text-black md:text-[1.7rem]">
                  Upload PDFs, ask questions from your material, generate quizzes, and review flashcards from one focused workspace.
                </p>
              </div>
            </div>

            <div className="mt-24 grid items-end gap-10 md:grid-cols-[15rem_minmax(0,1fr)_22rem] lg:mt-32">
              <Button
                variant="ghost"
                className={`min-h-11 px-8 text-sm font-medium ${blackButtonClasses}`}
                onClick={() => navigate("/auth")}
              >
                Start studying
              </Button>

              <div />

              <div className="scale-90 justify-self-start md:justify-self-center">
                <DotV />
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="landing-reveal relative bg-[#DCEBFF] px-5 py-24 md:px-8 md:py-28 lg:px-12">
          <div className="mx-auto grid max-w-[112rem] gap-14 lg:grid-cols-[0.72fr_1fr] lg:items-center">
            <div>
              <h2 className="max-w-2xl text-[2.85rem] font-black leading-[0.96] tracking-[-0.04em] md:text-[4.35rem]">
                One workspace for the whole study loop.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-black/72 md:text-lg">
                Understand faster. Practice smarter. Remember longer. LearnBot keeps the source, AI answer, quiz, and flashcards connected, so study time feels less scattered.
              </p>
              <Button
                variant="ghost"
                className={`mt-8 min-h-11 px-8 text-sm ${blackButtonClasses}`}
                onClick={() => navigate("/auth")}
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="landing-float rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF] p-5 shadow-[0_26px_70px_-48px_rgba(31,27,45,0.35)] transition duration-300 hover:-translate-y-1">
              <div className="grid gap-5 lg:grid-cols-[12rem_1fr]">
                <aside className="rounded-[1.15rem] border border-black/20 bg-white/55 p-4">
                  <p className="text-base font-bold tracking-[-0.03em]">Materials</p>
                  <div className="mt-4 space-y-2.5">
                    {["Lecture 5 PDF", "Exam guide", "Reading notes"].map((source, index) => (
                      <div key={source} className={`rounded-full border px-3.5 py-2.5 text-xs font-medium ${index === 0 ? "border-black bg-black text-white" : "border-black/20 bg-transparent text-black"}`}>
                        {source}
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="rounded-[1.15rem] bg-white/65 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-black tracking-[-0.04em]">Study Coach</p>
                      <p className="mt-2 max-w-2xl text-base leading-6 text-black/70">
                        Start with a summary, review the core terms, then take a short quiz on the sections you missed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-[1.15rem] border border-black/20 bg-[#FFFEEF] p-4">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4" />
                      <p className="text-base font-bold tracking-[-0.03em]">Ask from Lecture 5 PDF</p>
                    </div>
                    <p className="mt-3 text-lg leading-7 tracking-[-0.03em]">
                      Summarize this source in five study bullets and show me what to practice first.
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {studyActions.map((action) => (
                      <span key={action} className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-black/70">
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-reveal bg-[#FFFEEF] px-5 py-24 md:px-8 md:py-28 lg:px-12">
          <div className="mx-auto max-w-[104rem]">
            <h2 className="max-w-5xl text-[2.85rem] font-black leading-[0.96] tracking-[-0.04em] md:text-[4.35rem]">
              Built for actionable studying.
            </h2>
            <p className="mt-6 max-w-3xl text-base leading-7 text-black/70 md:text-lg">
              LearnBot is organized around the work students actually do: upload the material, understand the idea, then practice the parts that still feel soft.
            </p>
            <div className="mt-16">
              {steps.map((step) => (
                <div key={step.title} className="grid gap-6 border-t border-[#D8D4CC] py-10 md:grid-cols-[10rem_1fr] lg:grid-cols-[12rem_1fr]">
                  <div className="flex items-center gap-3">
                    <step.icon className="h-4 w-4" />
                    <p className="text-base font-medium tracking-[-0.03em] text-black/80">{step.label}</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black leading-tight tracking-[-0.04em] md:text-[2.65rem]">{step.title}</h3>
                    <p className="mt-4 max-w-3xl text-base leading-7 tracking-[-0.02em] text-black/70 md:text-lg">{step.description}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-[#D8D4CC]" />
            </div>
          </div>
        </section>

        <section id="features" className="landing-reveal bg-[#FFF8A8] px-5 py-24 md:px-8 md:py-28 lg:px-12">
          <div className="mx-auto max-w-[104rem] text-center">
            <h2 className="mx-auto max-w-4xl text-[2.85rem] font-black leading-[0.96] tracking-[-0.04em] md:text-[4.35rem]">
              Practice intelligence, not busywork.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 tracking-[-0.02em] text-black/70 md:text-lg">
              LearnBot connects understanding and recall so every study session has a next move instead of a blank prompt box.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-[104rem] items-start gap-8 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-[#D8D4CC] bg-[#DCEBFF] p-7 shadow-[0_22px_60px_-44px_rgba(31,27,45,0.25)] transition duration-300 hover:-translate-y-1 md:p-9">
              <p className="text-lg font-semibold tracking-[-0.04em]">{features[0].kicker}</p>
              <h3 className="mt-8 text-3xl font-black leading-tight tracking-[-0.04em] md:text-[2.8rem]">{features[0].title}</h3>
              <p className="mt-6 max-w-2xl text-base leading-7 tracking-[-0.02em] text-black/72 md:text-lg">{features[0].description}</p>
              <AiTutorPreview />
            </article>

            <article className="mt-0 rounded-[1.5rem] border border-[#D8D4CC] bg-[#DCEBFF] p-7 shadow-[0_22px_60px_-44px_rgba(31,27,45,0.25)] transition duration-300 hover:-translate-y-1 md:mt-16 md:p-9">
              <p className="text-lg font-semibold tracking-[-0.04em]">{features[1].kicker}</p>
              <h3 className="mt-8 text-3xl font-black leading-tight tracking-[-0.04em] md:text-[2.8rem]">{features[1].title}</h3>
              <p className="mt-6 max-w-2xl text-base leading-7 tracking-[-0.02em] text-black/72 md:text-lg">{features[1].description}</p>
              <RecallPreview />
            </article>
          </div>
        </section>

        <section className="landing-reveal relative min-h-[34rem] bg-[#FFFEEF] px-5 py-24 text-center md:px-8 md:py-28 lg:px-12">
          <DotCluster className="mx-auto scale-75" />
          <p className="mt-10 text-xl font-semibold tracking-[-0.035em]">Ready to study with focus?</p>
          <h2 className="mx-auto mt-10 max-w-5xl text-[2.85rem] font-black leading-[1.02] tracking-[-0.04em] md:text-[4.35rem]">
            Upload one source and turn it into answers, quizzes, and flashcards.
          </h2>
          <Button
            variant="ghost"
            className={`mt-10 min-h-12 px-9 text-base ${blackButtonClasses}`}
            onClick={() => navigate("/auth")}
          >
            Get Started
            <ArrowRight className="h-6 w-6" />
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Landing;
