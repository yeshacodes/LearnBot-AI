import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import { Button, Card, ErrorState, Input, LoadingState } from "../components/Common";
import { supabase } from "../src/lib/supabase";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_18px_38px_-24px_color-mix(in_oklab,var(--accent)_80%,transparent)]">
            <Layers className="h-10 w-10" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary">Set new password</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-muted">Choose a secure password for your account.</p>
        </div>

        <Card className="p-8">
          {checkingRecovery ? (
            <LoadingState label="Checking reset link" />
          ) : !hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <ErrorState title="Reset link expired" message="This reset link is invalid or expired. Please request a new one." embedded />
              <Button type="button" className="w-full" onClick={() => navigate("/auth", { replace: true })}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="New password"
                type="password"
                placeholder="Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Updating..." : "Update password"}
              </Button>
              {error && <ErrorState title="Password reset failed" message={error} embedded />}
              {success && <p className="text-center text-sm font-semibold text-primary">{success}</p>}
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
