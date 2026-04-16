import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import { Button, Card, Input } from "../components/Common";
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
      if (data.session) {
        setHasRecoverySession(true);
        setCheckingRecovery(false);
        return;
      }
      setHasRecoverySession(false);
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-accent rounded-[2rem] border-[4px] border-default shadow-brutal flex items-center justify-center mb-6 transform -rotate-3 hover:rotate-0 transition-transform">
            <Layers className="text-black w-10 h-10" />
          </div>
          <h1 className="text-4xl font-heading font-black text-primary uppercase tracking-tight">Set new password</h1>
          <p className="text-primary font-bold mt-2">Choose a secure password for your account.</p>
        </div>

        <Card className="p-8">
          {checkingRecovery ? (
            <p className="text-sm text-center text-primary font-bold">Checking reset link...</p>
          ) : !hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-primary font-bold">This reset link is invalid or expired. Please request a new one.</p>
              <Button type="button" className="w-full py-3" onClick={() => navigate("/auth", { replace: true })}>
                Back to Sign in
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
            <Button type="submit" className="w-full py-3" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
            {error && <p className="text-sm text-accent text-center">{error}</p>}
            {success && <p className="text-sm text-primary text-center">{success}</p>}
          </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
