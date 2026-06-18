import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, LogIn, Menu, UserPlus, X } from "lucide-react";
import { ErrorState } from "../components/Common";
import { useAuth } from "../src/contexts/AuthContext";
import { supabase } from "../src/lib/supabase";

const blackButtonClasses =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black bg-black px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15 disabled:pointer-events-none disabled:opacity-55";
const googleButtonClasses =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#D8D4CC] bg-[#FFFEEF]/80 px-6 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:border-black/45 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:pointer-events-none disabled:opacity-55";
const inputClasses =
  "h-[52px] w-full rounded-full border border-[#D8D4CC] bg-[#FFF9C7]/42 px-5 text-base text-black outline-none transition placeholder:text-black/50 focus:border-black/70 focus:bg-[#FFFEEF] focus:ring-4 focus:ring-black/10";
const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "FAQ", href: "/#how-it-works" },
];

const DotMini = ({ className = "" }: { className?: string }) => {
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
    <div className={`relative h-20 w-32 opacity-70 ${className}`} aria-hidden="true">
      {dots.map((position) => (
        <span key={position} className={`absolute h-3 w-3 rounded-full bg-black ${position}`} />
      ))}
    </div>
  );
};

const Login: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    return from || "/app/dashboard";
  }, [location.state]);

  React.useEffect(() => {
    if (session && mode !== "reset") {
      navigate(redirectPath, { replace: true });
    }
  }, [session, navigate, redirectPath, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate(redirectPath, { replace: true });
      } else if (mode === "signup") {
        await signUp(email, password);
        setSuccess("Sign-up successful. Check your email to confirm your account.");
      } else {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        setSuccess("Password reset link sent. Check your email.");
      }
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : mode === "login"
          ? "Unable to sign in"
          : mode === "signup"
            ? "Unable to sign up"
            : "Unable to send reset link";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Google sign in");
      setSubmitting(false);
    }
  };

  const title = mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";
  const rightButtonLabel = mode === "login" ? "Create Account" : "Sign In";
  const submitLabel = submitting
    ? mode === "login"
      ? "Signing in..."
      : mode === "signup"
        ? "Signing up..."
        : "Sending..."
    : mode === "login"
      ? "Sign in"
      : mode === "signup"
        ? "Sign up"
        : "Send reset link";

  const switchAuthMode = () => {
    setError("");
    setSuccess("");
    setMobileMenuOpen(false);
    setMode(mode === "login" ? "signup" : "login");
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
            LearnBot
          </button>

          <nav className="hidden items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[13px] font-semibold text-[#FFFEEF] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.8)] md:flex" aria-label="Auth navigation">
            {navItems.map((item) => (
              <a key={item.label} className="rounded-full px-3.5 py-2 transition hover:text-[#FFF8A8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <button type="button" className={`${blackButtonClasses} hidden min-h-9 justify-self-end px-6 md:inline-flex`} onClick={switchAuthMode}>
            {rightButtonLabel}
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
            <nav className="flex flex-col gap-1 text-sm font-semibold" aria-label="Mobile auth navigation">
              {navItems.map((item) => (
                <a key={item.label} className="rounded-full px-4 py-3 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20" href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </a>
              ))}
              <button type="button" className="mt-1 rounded-full bg-[#8B5CF6] px-4 py-3 text-left font-bold text-white transition hover:bg-[#7C3AED] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/30" onClick={switchAuthMode}>
                {rightButtonLabel}
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="relative min-h-screen px-4 pb-10 pt-28 md:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_54%,#FFF79A_0%,rgba(255,247,154,0.68)_24%,rgba(255,254,239,0.95)_54%,#FFFFFF_100%)]" />
        <div className="pointer-events-none absolute right-[21%] top-28 hidden md:block">
          <DotMini />
        </div>

        <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[112rem] items-center justify-center">
          <div className="relative w-full max-w-[36rem] rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF]/95 p-6 shadow-[0_24px_70px_-56px_rgba(31,27,45,0.5)] md:p-8">
            <DotMini className="pointer-events-none absolute -left-8 -top-8 -z-10 hidden md:block" />
            <h1 className="text-[2.125rem] font-black leading-tight tracking-[-0.04em] md:text-[2.75rem]">{title}</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-black/62">
              {mode === "login"
                ? "Continue studying from your saved materials."
                : mode === "signup"
                  ? "Create a focused space for your notes, quizzes, and reviews."
                  : "We'll send a reset link to your email."}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {mode === "signup" && (
                <label className="block">
                  <span className="text-sm font-semibold tracking-[-0.015em]">Full name *</span>
                  <input
                    className={`mt-3 ${inputClasses}`}
                    type="text"
                    placeholder="Enter your name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                  />
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold tracking-[-0.015em]">Email *</span>
                <input
                  className={`mt-3 ${inputClasses}`}
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </label>

              {mode !== "reset" && (
                <label className="block">
                  <span className="text-sm font-semibold tracking-[-0.015em]">Password *</span>
                  <span className="relative mt-3 block">
                    <input
                      className={`${inputClasses} pr-12`}
                      type={passwordVisible ? "text" : "password"}
                      placeholder="Enter your password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((visible) => !visible)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                      disabled={submitting}
                    >
                      {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                </label>
              )}

              {error && <ErrorState title="Authentication failed" message={error} embedded />}
              {success && <p className="rounded-2xl border border-black/20 bg-white/45 p-3 text-sm font-medium text-black">{success}</p>}

              {mode === "login" && (
                <p className="-mt-1 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setError("");
                      setSuccess("");
                    }}
                    className="rounded-lg font-semibold text-black/75 hover:text-black hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                  >
                    Forgot password?
                  </button>
                </p>
              )}

              <button type="submit" className={`${blackButtonClasses} min-h-[52px] w-full`} disabled={submitting}>
                {mode === "login" ? <LogIn className="h-4 w-4" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : null}
                {submitLabel}
              </button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#D8D4CC]" /></div>
                  <div className="relative flex justify-center text-sm">
                    <span className="rounded-full border border-[#D8D4CC] bg-[#FFFEEF] px-3.5 py-1 text-xs font-medium text-black/70">Or continue with</span>
                  </div>
                </div>

                <button type="button" onClick={handleGoogleSignIn} disabled={submitting} className={`${googleButtonClasses} w-full`}>
                  <Layers className="h-4 w-4" />
                  Google
                </button>
              </>
            )}

            {(mode === "login" || mode === "signup") && (
              <p className="mt-6 text-center text-sm font-medium text-black/70">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError("");
                    setSuccess("");
                  }}
                  className="ml-1 rounded-lg font-semibold text-black hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                >
                  {mode === "login" ? "Create account" : "Sign in"}
                </button>
              </p>
            )}

            {mode === "reset" && (
              <p className="mt-5 text-center text-sm font-medium text-black/70">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-lg font-semibold text-black hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
