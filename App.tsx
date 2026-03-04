
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthCallback from "./pages/AuthCallback";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import Flashcards from "./pages/Flashcards";
import Sources from "./pages/Sources";
import Settings from "./pages/Settings";
import DashboardLayout from "./components/DashboardLayout";
import { AppRoute, User } from "./types";
import { useAuth } from "./src/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const App: React.FC = () => {
  const { user: authUser, session, loading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const user: User | null = useMemo(() => {
    if (!authUser) return null;
    const nameFromMeta = (authUser.user_metadata?.name as string | undefined)?.trim();
    const nameFallback = authUser.email?.split("@")[0] || "User";
    return {
      id: authUser.id,
      email: authUser.email || "unknown@example.com",
      name: nameFromMeta || nameFallback,
    };
  }, [authUser]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("learnbot_theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("learnbot_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("learnbot_theme", "light");
      }
      return newVal;
    });
  };

  const defaultAppRoute = AppRoute.CHAT;

  return (
    <div className="min-h-screen bg-background text-primary">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={loading ? <div className="min-h-screen bg-background" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Landing />}
          />
          <Route
            path="/auth"
            element={loading ? <div className="min-h-screen bg-background" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Login />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route
            path="/login"
            element={loading ? <div className="min-h-screen bg-background" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={<Navigate to="/login" replace />}
          />

          {/* Protected App Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/app">
              <Route index element={<Navigate to={defaultAppRoute} replace />} />
              <Route path="upload" element={<Upload />} />
              <Route path="chat" element={<Chat />} />
              <Route path="flashcards" element={<Flashcards />} />
              <Route path="sources" element={<Sources />} />
              <Route
                path="settings"
                element={<Settings user={user} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />}
              />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={session ? defaultAppRoute : "/"} replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
