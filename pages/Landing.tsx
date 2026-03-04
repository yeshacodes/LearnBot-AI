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
  "rounded-3xl p-6 bg-white border border-slate-200/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-white/5 dark:border-white/10 dark:shadow-black/20";

const chipClass =
  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-300/70 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-primary">
      <div className="max-w-6xl mx-auto px-6">
        <section className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl shadow-xl shadow-accent/20 mb-6">
            <Layers className="w-10 h-10 text-white" />
          </div>
          <Badge color="blue">LearnBot Platform</Badge>
          <h1 className="mt-5 text-4xl md:text-6xl font-black tracking-tight">
            Learn Faster With AI-Powered Study Workflows
          </h1>
          <p className="mt-4 text-muted max-w-2xl mx-auto">
            Upload your sources, chat with context, and generate flashcards in one focused workspace.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="px-8 py-3" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold text-sm border border-default bg-white/5 hover:bg-white/10 transition-colors"
            >
              Explore Features
            </a>
          </div>
        </section>

        <section id="features" className="py-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center">What LearnBot Does</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className={panelClass}>
                <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center">How It Works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className={panelClass}>
                <p className="text-xs font-black uppercase tracking-widest text-muted">Step {index + 1}</p>
                <p className="mt-3 font-bold text-primary">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-center">Tech Stack</h2>
          <div className="mt-10 space-y-6">
            <div className={panelClass}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">Frontend</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={chipClass}>React</span>
                <span className={chipClass}>TypeScript</span>
                <span className={chipClass}>Vercel</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">Backend</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={chipClass}>FastAPI</span>
                <span className={chipClass}>Render</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">ML</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={chipClass}>FAISS</span>
                <span className={chipClass}>Vector Embeddings</span>
                <span className={chipClass}>RAG</span>
              </div>
            </div>
            <div className={panelClass}>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted">Storage</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
