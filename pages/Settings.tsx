import React, { useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ErrorState, PageHeader } from "../components/Common";
import { User } from "../types";
import { useAuth } from "../src/contexts/AuthContext";

interface SettingsProps {
  user: User | null;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleDarkMode }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Failed to sign out");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Settings" }]}
        eyebrow="Settings"
        title="Account preferences"
        description="Manage display preferences and session access."
      />

      {logoutError && <ErrorState title="Sign out failed" message={logoutError} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold text-primary">Theme</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">Choose the visual mode that feels best for focused study.</p>
            </div>
            <div className="rounded-2xl bg-surface2 p-3 text-accent">
              {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-pressed={isDarkMode}
            className="mt-8 flex w-full items-center justify-between rounded-3xl bg-surface2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
          >
            <span>
              <span className="block text-sm font-bold text-primary">{isDarkMode ? "Dark mode" : "Light mode"}</span>
              <span className="mt-1 block text-sm font-medium text-muted">Soft UI colors update across the app.</span>
            </span>
            <span className={`flex h-8 w-14 items-center rounded-full p-1 transition ${isDarkMode ? "bg-accent" : "bg-white/80"}`}>
              <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition ${isDarkMode ? "translate-x-6" : "translate-x-0"}`} />
            </span>
          </button>
        </Card>

        <Card className="p-8">
          <h2 className="text-2xl font-bold text-primary">Account</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-muted">Signed in as {user?.email ?? "unknown@example.com"}.</p>
          <div className="mt-8 rounded-3xl bg-surface2 p-5">
            <p className="text-sm font-bold text-primary">{user?.name ?? "LearnBot user"}</p>
            <p className="mt-1 text-sm font-medium text-muted">{user?.email ?? "No email available"}</p>
          </div>
          <Button onClick={handleLogout} disabled={isSigningOut} className="mt-6" variant="danger" icon={LogOut}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
