import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Menu, X } from "lucide-react";
import { ErrorState } from "../components/Common";
import { supabase } from "../src/lib/supabase";

const blackButtonClasses =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black bg-black px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-black/85 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15 disabled:pointer-events-none disabled:opacity-55";
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

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasRecoverySession(!!data.session);
      setCheckingRecovery(false);
    };
    checkRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || !!session) {
        setHasRecoverySession(true);
      }
      setCheckingRecovery(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setSuccess("Password updated successfully. Redirecting to sign in...");
      setTimeout(() => navigate("/auth", { replace: true }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
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

          <nav className="hidden items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[13px] font-semibold text-[#FFFEEF] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.8)] md:flex" aria-label="Reset password navigation">
            {navItems.map((item) => (
              <a key={item.label} className="rounded-full px-3.5 py-2 transition hover:text-[#FFF8A8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFF8A8]/20" href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <button type="button" className={`${blackButtonClasses} hidden min-h-9 justify-self-end px-6 md:inline-flex`} onClick={() => navigate("/auth", { replace: true })}>
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
            <nav className="flex flex-col gap-1 text-sm font-semibold" aria-label="Mobile reset password navigation">
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
        <div className="pointer-events-none absolute right-[21%] top-28 hidden md:block">
          <DotMini />
        </div>

        <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[112rem] items-center justify-center">
          <div className="relative w-full max-w-[36rem] rounded-[1.5rem] border border-[#D8D4CC] bg-[#FFFEEF]/95 p-6 shadow-[0_24px_70px_-56px_rgba(31,27,45,0.5)] md:p-8">
            <DotMini className="pointer-events-none absolute -left-8 -top-8 -z-10 hidden md:block" />
            <h1 className="text-[2.125rem] font-black leading-tight tracking-[-0.04em] md:text-[2.75rem]">Reset password</h1>
            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-black/62">Choose a new password for your LearnBot account.</p>

          {checkingRecovery ? (
            <div className="mt-7 flex items-center justify-center gap-3 rounded-[1.25rem] border border-[#D8D4CC] bg-white/60 p-5 text-sm font-semibold text-black/70">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D8D4CC] border-t-black" />
              Checking reset link
            </div>
          ) : !hasRecoverySession ? (
            <div className="mt-8 space-y-4 text-center">
              <ErrorState title="Reset link expired" message="This reset link is invalid or expired. Please request a new one." embedded />
              <button type="button" className={`${blackButtonClasses} w-full`} onClick={() => navigate("/auth", { replace: true })}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold tracking-[-0.015em]">New password *</span>
                <span className="relative mt-3 block">
                  <input
                    className={`${inputClasses} pr-12`}
                    type={newPasswordVisible ? "text" : "password"}
                    placeholder="Enter your new password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordVisible((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                    aria-label={newPasswordVisible ? "Hide password" : "Show password"}
                    disabled={submitting}
                  >
                    {newPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-semibold tracking-[-0.015em]">Confirm password *</span>
                <span className="relative mt-3 block">
                  <input
                    className={`${inputClasses} pr-12`}
                    type={confirmPasswordVisible ? "text" : "password"}
                    placeholder="Confirm your new password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-black transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
                    aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
                    disabled={submitting}
                  >
                    {confirmPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </span>
              </label>
              <button type="submit" className={`${blackButtonClasses} min-h-[52px] w-full`} disabled={submitting}>
                {submitting ? "Updating..." : "Update password"}
              </button>
              {error && <ErrorState title="Password reset failed" message={error} embedded />}
              {success && <p className="rounded-2xl border border-black/20 bg-white/45 p-3 text-center text-sm font-semibold text-black">{success}</p>}
            </form>
          )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ResetPassword;
