import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Menu, X } from "lucide-react";
import { supabase } from "../src/lib/supabase";

// Supabase setup checklist:
// 1) Supabase Dashboard -> Auth -> Providers -> Google enabled
// 2) Google Cloud Console OAuth app created
// 3) Google Authorized redirect URI = https://<project-ref>.supabase.co/auth/v1/callback
// 4) Supabase Auth URL Configuration includes localhost + production /auth/callback and /auth/reset URLs

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        if (data.session) {
          navigate("/app/chat", { replace: true });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!cancelled) {
        setError("We couldn't complete Google sign in. Please try again.");
      }
    };

    resolveSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "FAQ", href: "/#how-it-works" },
  ];

  const dots = [
    "left-0 top-0",
    "left-4 top-4",
    "left-8 top-8",
    "left-12 top-12",
    "left-16 top-8",
    "left-20 top-4",
    "left-24 top-0",
  ];

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
            LearnBot
          </button>

          <nav className="hidden items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[13px] font-semibold text-[#FFFEEF] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.8)] md:flex" aria-label="Auth callback navigation">
            {navItems.map((item) => (
              <a key={item.label} className="rounded-full px-3.5 py-2 transition hover:text-[#FFF8A8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="hidden min-h-9 items-center justify-center rounded-full border border-black bg-black px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15 md:inline-flex md:justify-self-end"
            onClick={() => navigate("/auth", { replace: true })}
          >
            Sign In
          </button>

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
            <nav className="flex flex-col gap-1 text-sm font-semibold" aria-label="Mobile auth callback navigation">
              {navItems.map((item) => (
                <a key={item.label} className="rounded-full px-4 py-3 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20" href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              <button type="button" className="mt-1 rounded-full bg-[#8B5CF6] px-4 py-3 text-left font-bold text-white transition hover:bg-[#7C3AED] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/30" onClick={() => navigate("/auth", { replace: true })}>
                Sign In
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="relative min-h-screen px-4 pb-10 pt-28 md:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_54%,#FFF79A_0%,rgba(255,247,154,0.68)_24%,rgba(255,254,239,0.95)_54%,#FFFFFF_100%)]" />
        <div className="pointer-events-none absolute right-[21%] top-28 hidden md:block" aria-hidden="true">
          <div className="relative h-20 w-32 opacity-70">
            {dots.map((position) => (
              <span key={position} className={`absolute h-3 w-3 rounded-full bg-black ${position}`} />
            ))}
          </div>
        </div>

        <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[112rem] items-center justify-center">
          <div className="w-full max-w-[36rem] rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF]/95 p-6 text-center shadow-[0_24px_70px_-56px_rgba(31,27,45,0.5)] md:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-black text-white">
              <Layers className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-[2.125rem] font-black leading-tight tracking-[-0.04em] md:text-[2.75rem]">Signing you in...</h1>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/62">Please wait while we finish Google sign-in.</p>

            <div className="mt-7 rounded-[1.25rem] border border-[#D8D4CC] bg-white/60 p-5">
              {error ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-black">{error}</p>
                  <button
                    type="button"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-black bg-black px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                    onClick={() => navigate("/auth", { replace: true })}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 py-2 text-sm font-semibold text-black/70">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D8D4CC] border-t-black" />
                  Completing secure sign-in
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthCallback;
