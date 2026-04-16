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
  "rounded-3xl p-6 bg-card border-[4px] border-default shadow-brutal transition-all hover:shadow-brutal-lg hover:-translate-y-1 text-primary";

const chipClass =
  "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border-[3px] border-default bg-yellow text-black";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-primary bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <section className="py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-[2rem] border-[4px] border-default shadow-brutal mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
            <Layers className="w-10 h-10 text-black" />
          </div>
          <div>
            <Badge color="blue">LearnBot Platform</Badge>
          </div>
          <h1 className="mt-8 text-5xl md:text-7xl font-heading font-black tracking-tighter text-primary uppercase">
            Learn Faster With AI-Powered Study Workflows
          </h1>
          <p className="mt-6 text-primary font-bold max-w-2xl mx-auto text-lg">
            Upload your sources, chat with context, and generate flashcards in one focused workspace.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button className="px-10 py-5 text-lg border-[4px] shadow-brutal" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="w-6 h-6 ml-3 text-black" />
            </Button>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-5 rounded-[2rem] font-black text-[15px] uppercase tracking-widest border-[4px] border-default bg-card text-primary hover:bg-yellow hover:text-black hover:-translate-y-1 hover:shadow-brutal transition-all"
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
                <div className="w-14 h-14 rounded-2xl bg-purple border-[3px] border-default text-black flex items-center justify-center mb-6 shadow-sm">
                  <feature.icon className="w-8 h-8 text-black" />
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
