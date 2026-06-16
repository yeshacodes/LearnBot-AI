import React from "react";
import { useNavigate } from "react-router-dom";
import { Layers, ArrowRight, Upload, Database, Sparkles } from "lucide-react";
import { Button, Badge } from "../components/Common";

const features = [
  {
    title: "Upload & Parse Documents",
    description: "Ingest PDFs and turn raw files into clean, machine-readable study context.",
    icon: Upload,
  },
  {
    title: "Context-Aware Q&A (RAG)",
    description: "Answer questions using retrieval from your indexed sources for grounded responses.",
    icon: Database,
  },
  {
    title: "Flashcard Generation & Persistence",
    description: "Generate cards automatically and persist structured Q&A for repeatable learning.",
    icon: Sparkles,
  },
];

const steps = [
  "Upload PDFs",
  "Parse & Chunk",
  "Embed + Index in FAISS",
  "Retrieve + Generate AI Response",
];

const panelClass =
  "rounded-3xl p-6 bg-card border border-white/60 shadow-[12px_12px_36px_var(--shadow),-10px_-10px_30px_rgba(255,255,255,0.45)] backdrop-blur-xl transition-all hover:-translate-y-1 text-primary";

const chipClass =
  "px-4 py-1.5 rounded-full text-xs font-bold bg-surface2 text-primary";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-primary bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <section className="py-20 text-center">
          <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-white shadow-[0_18px_38px_-24px_color-mix(in_oklab,var(--accent)_80%,transparent)] transition-transform hover:-translate-y-1">
            <Layers className="w-10 h-10" />
          </div>
          <div>
            <Badge color="blue">LearnBot Platform</Badge>
          </div>
          <h1 className="mt-8 text-5xl md:text-7xl font-heading font-bold tracking-tight text-primary">
            Learn Faster With AI-Powered Study Workflows
          </h1>
          <p className="mt-6 text-primary font-bold max-w-2xl mx-auto text-lg">
            Upload your sources, chat with context, and generate flashcards in one focused workspace.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="px-10 py-5 text-lg" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-2xl bg-card px-8 py-5 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-surface2 hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
            >
              Explore Features
            </a>
          </div>
        </section>

        <section id="features" className="py-20">
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-center text-primary uppercase">What LearnBot Does</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className={panelClass}>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black tracking-tight font-heading uppercase text-primary">{feature.title}</h3>
                <p className="mt-3 text-base font-bold text-primary/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-center text-primary uppercase">How It Works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className={panelClass}>
                <p className="text-[13px] font-black uppercase tracking-widest text-primary/70">Step {index + 1}</p>
                <p className="mt-4 font-bold text-primary text-lg">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-center text-primary uppercase">Tech Stack</h2>
          <div className="mt-12 space-y-6">
            <div className={panelClass}>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">Frontend</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className={chipClass}>React</span>
                <span className={chipClass}>TypeScript</span>
                <span className={chipClass}>Vercel</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">Backend</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className={chipClass}>FastAPI</span>
                <span className={chipClass}>Render</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">ML</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className={chipClass}>FAISS</span>
                <span className={chipClass}>Vector Embeddings</span>
                <span className={chipClass}>RAG</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-primary">Storage</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className={chipClass}>SQLite</span>
                <span className={chipClass}>CSV</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Landing;
