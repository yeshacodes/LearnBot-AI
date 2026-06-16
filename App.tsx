import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthCallback from "./pages/AuthCallback";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./components/DashboardLayout";
import { LoadingState } from "./components/Common";
import { AppRoute, User } from "./types";
import { useAuth } from "./src/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Upload = lazy(() => import("./pages/Upload"));
const Chat = lazy(() => import("./pages/Chat"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Sources = lazy(() => import("./pages/Sources"));
const Settings = lazy(() => import("./pages/Settings"));
const Quiz = lazy(() => import("./pages/Quiz"));

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

  const defaultAppRoute = AppRoute.DASHBOARD;

  return (
    <div className="min-h-screen bg-background text-primary">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={loading ? <div className="min-h-screen" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Landing />}
          />
          <Route
            path="/auth"
            element={loading ? <div className="min-h-screen" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Login />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route
            path="/login"
            element={loading ? <div className="min-h-screen" /> : session ? <Navigate to={defaultAppRoute} replace /> : <Login />}
          />
          <Route path="/register" element={<Navigate to="/login" replace />} />

          {/* Protected App Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to={defaultAppRoute} replace />} />
            <Route path="dashboard" element={<Suspense fallback={<LoadingState label="Loading dashboard" />}><Dashboard user={user} /></Suspense>} />
            <Route path="upload" element={<Suspense fallback={<LoadingState label="Loading upload" />}><Upload /></Suspense>} />
            <Route path="chat" element={<Suspense fallback={<LoadingState label="Loading chat" />}><Chat /></Suspense>} />
            <Route path="flashcards" element={<Suspense fallback={<LoadingState label="Loading flashcards" />}><Flashcards /></Suspense>} />
            <Route path="quiz" element={<Suspense fallback={<LoadingState label="Loading quiz" />}><Quiz /></Suspense>} />
            <Route path="sources" element={<Suspense fallback={<LoadingState label="Loading sources" />}><Sources /></Suspense>} />
            <Route
              path="settings"
              element={<Suspense fallback={<LoadingState label="Loading settings" />}><Settings user={user} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} /></Suspense>}
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={session ? defaultAppRoute : "/"} replace />} />
        </Routes>

        <Analytics />
      </BrowserRouter>
    </div>
  );
};

export default App;
