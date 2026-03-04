
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layers, LogIn, UserPlus } from "lucide-react";
import { Button, Card, Input } from "../components/Common";
import { useAuth } from "../src/contexts/AuthContext";
import { supabase } from "../src/lib/supabase";

const Login: React.FC = () => {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-accent/20">
            <Layers className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-primary">
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset password"}
          </h1>
          <p className="text-muted mt-2">
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
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
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
                  className="text-muted hover:text-primary"
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
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-default"></div></div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border-2 border-default rounded-xl hover:bg-surface2 transition-colors"
              >
                <Layers className="w-5 h-5 text-accent" />
                <span className="font-medium text-primary">Google</span>
              </button>
            </>
          )}

          {(mode === "login" || mode === "signup") && (
            <p className="mt-6 text-sm text-center text-muted">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setSuccess("");
                }}
                className="font-medium text-pink-500 hover:text-pink-400 hover:underline"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          )}
          {mode === "reset" && (
            <p className="mt-2 text-sm text-center text-muted">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
                className="font-medium text-pink-500 hover:text-pink-400 hover:underline"
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
