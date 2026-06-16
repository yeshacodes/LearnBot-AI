import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, LogIn, UserPlus } from "lucide-react";
import { Button, Card, ErrorState, Input } from "../components/Common";
import { useAuth } from "../src/contexts/AuthContext";
import { supabase } from "../src/lib/supabase";

const Login: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
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

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password";
  const description =
    mode === "login"
      ? "Sign in to continue learning with LearnBot."
      : mode === "signup"
        ? "Create your LearnBot workspace."
        : "Enter your email and we will send you a reset link.";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent text-white shadow-[0_18px_38px_-24px_color-mix(in_oklab,var(--accent)_80%,transparent)]">
            <Layers className="h-10 w-10" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">{title}</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-muted">{description}</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <Input
                label="Full name"
                type="text"
                placeholder="Jane Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
            )}
            <Input
              label="Email address"
              type="email"
              placeholder="jane@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            {mode !== "reset" && (
              <div className="w-full space-y-2">
                <label className="ml-1 text-sm font-semibold text-primary">Password</label>
                <div className="relative">
                  <input
                    className="w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 pr-12 text-sm font-semibold text-primary outline-none transition-all placeholder:text-muted focus:border-accent focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_16%,transparent)] dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
                    type={passwordVisible ? "text" : "password"}
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((visible) => !visible)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                    disabled={submitting}
                  >
                    {passwordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting} icon={mode === "login" ? LogIn : mode === "signup" ? UserPlus : undefined}>
              {submitting
                ? mode === "login"
                  ? "Signing in..."
                  : mode === "signup"
                    ? "Signing up..."
                    : "Sending..."
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Sign up"
                    : "Send reset link"}
            </Button>

            {mode === "login" && (
              <p className="text-right text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError("");
                    setSuccess("");
                  }}
                  className="rounded-lg font-bold text-primary hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                >
                  Forgot password?
                </button>
              </p>
            )}
            {error && <ErrorState title="Authentication failed" message={error} embedded />}
            {success && <p className="text-center text-sm font-semibold text-primary">{success}</p>}
          </form>

          {mode !== "reset" && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-default" /></div>
                <div className="relative flex justify-center text-sm">
                  <span className="rounded-full border border-default bg-card px-4 py-1 text-xs font-bold text-primary">Or continue with</span>
                </div>
              </div>

              <Button type="button" onClick={handleGoogleSignIn} disabled={submitting} variant="soft" className="w-full" icon={Layers}>
                Google
              </Button>
            </>
          )}

          {(mode === "login" || mode === "signup") && (
            <p className="mt-8 text-center text-sm font-medium text-muted">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="ml-1 rounded-lg font-bold text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          )}
          {mode === "reset" && (
            <p className="mt-4 text-center text-sm font-medium text-muted">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className="rounded-lg font-bold text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
              >
                Back to sign in
              </button>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
