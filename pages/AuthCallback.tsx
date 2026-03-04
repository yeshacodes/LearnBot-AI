import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import { Button, Card } from "../components/Common";
import { supabase } from "../src/lib/supabase";

// Supabase setup checklist:
// 1) Supabase Dashboard -> Auth -> Providers -> Google enabled
// 2) Google Cloud Console OAuth app created
// 3) Google Authorized redirect URI = https://<project-ref>.supabase.co/auth/v1/callback
// 4) Supabase Auth URL Configuration includes localhost + production /auth/callback and /auth/reset URLs

const AuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-accent/20">
            <Layers className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Signing you in...</h1>
          <p className="text-muted mt-2">Please wait while we finish Google sign-in.</p>
        </div>

        <Card className="p-8">
          {error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-accent">{error}</p>
              <Button type="button" className="w-full py-3" onClick={() => navigate("/auth", { replace: true })}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="w-7 h-7 rounded-full border-2 border-default border-t-accent animate-spin" />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthCallback;
