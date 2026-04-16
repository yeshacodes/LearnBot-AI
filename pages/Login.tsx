
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Layers, LogIn, UserPlus } from "lucide-react";
import { Button, Card, Input } from "../components/Common";
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
    return from || "/app/chat";
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-accent rounded-[2rem] border-[4px] border-default shadow-brutal flex items-center justify-center mb-6 transform -rotate-3 hover:rotate-0 transition-transform">
            <Layers className="text-black w-10 h-10" />
          </div>
          <h1 className="text-4xl font-heading font-black text-primary uppercase tracking-tight">
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset password"}
          </h1>
          <p className="text-primary font-bold mt-3">
            {mode === "login"
              ? "Sign in to your LearnBot account"
              : mode === "signup"
                ? "Start your learning journey with LearnBot"
                : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
            )}
            {mode === "reset" && (
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="jane@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            )}
            {mode !== "reset" && (
              <>
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="jane@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
            <div className="space-y-2 w-full">
              <label className="text-[12px] font-black text-primary uppercase tracking-[0.2em] ml-2">Password</label>
              <div className="relative">
                <input
                  className="
                    w-full px-5 py-4 pr-12 bg-card border-[3px] border-default
                    rounded-xl focus:border-accent transition-all outline-none text-primary font-bold placeholder-muted
                  "
                  type={passwordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-accent transition-colors"
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  disabled={submitting}
                >
                  {passwordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
              </>
            )}
            
            <Button type="submit" className="w-full py-3" disabled={submitting}>
              {mode === "login" ? <LogIn className="w-4 h-4 mr-2" /> : mode === "signup" ? <UserPlus className="w-4 h-4 mr-2" /> : null}
              {submitting
                ? mode === "login"
                  ? "Signing In..."
                  : mode === "signup"
                    ? "Signing Up..."
                    : "Sending..."
                : mode === "login"
                  ? "Sign In"
                  : mode === "signup"
                    ? "Sign Up"
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
                  className="text-primary font-bold hover:text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            )}
            {error && <p className="text-sm text-accent text-center">{error}</p>}
            {success && <p className="text-sm text-primary text-center">{success}</p>}
          </form>

          {mode !== "reset" && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t-[3px] border-default"></div></div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 py-1 bg-card border-[3px] border-default font-black uppercase text-[10px] tracking-widest text-primary">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border-[3px] border-default text-primary rounded-xl hover:-translate-y-1 hover:shadow-brutal hover:text-black hover:bg-yellow transition-all active:translate-y-0 active:shadow-none font-black uppercase tracking-widest text-[12px]"
              >
                <Layers className="w-5 h-5" />
                <span>Google</span>
              </button>
            </>
          )}

          {(mode === "login" || mode === "signup") && (
            <p className="mt-8 text-sm text-center text-primary font-bold">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="font-black text-accent hover:text-primary hover:underline ml-2"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          )}
          {mode === "reset" && (
            <p className="mt-4 text-sm text-center text-primary font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className="font-black text-accent hover:text-primary hover:underline"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;

