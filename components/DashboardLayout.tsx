import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Brain,
  Columns2,
  LayoutDashboard,
  Layers3,
  Library,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { AppRoute } from "../types";
import { useAuth } from "../src/contexts/AuthContext";
import { getBool, setBool } from "../src/lib/uiPrefs";
import { supabase } from "../src/lib/supabase";

const CHAT_SIDEBAR_COLLAPSED_KEY = "learnbot_chat_sidebar_collapsed";
const CHAT_CONTEXT_COLLAPSED_KEY = "learnbot_chat_context_collapsed";

const navItems = [
  { label: "Dashboard", path: AppRoute.DASHBOARD, icon: LayoutDashboard },
  { label: "Materials", path: AppRoute.SOURCES, icon: Library },
  { label: "Study Coach", path: AppRoute.CHAT, icon: Sparkles },
  { label: "Flashcards", path: AppRoute.FLASHCARDS, icon: Layers3 },
  { label: "Quiz", path: AppRoute.QUIZ, icon: Brain },
  { label: "Memory", path: AppRoute.UPLOAD, icon: UploadCloud },
  { label: "Settings", path: AppRoute.SETTINGS, icon: Settings2 },
];

const DashboardLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [chatContextCollapsed, setChatContextCollapsed] = useState<boolean>(() => getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === AppRoute.CHAT;
  const displayName = profileDisplayName || (user?.email ? user.email.split("@")[0] : "User");

  const handleLogoutClick = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const onPrefsChanged = () => setChatContextCollapsed(getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
    window.addEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
    return () => window.removeEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfileName = async () => {
      if (!user?.id) {
        setProfileDisplayName(null);
        return;
      }
      const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (cancelled) return;
      setProfileDisplayName(error ? null : data?.display_name ?? null);
    };
    loadProfileName();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const dock = (
    <nav className="flex flex-col items-center gap-2" aria-label="Primary navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setMobileNavOpen(false)}
          className={({ isActive }) =>
            `group relative flex h-12 w-12 items-center justify-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 ${
              isActive
                ? "border-[#D6C8FF] bg-[#EFE7FF] text-[#050505] shadow-[0_12px_28px_rgba(40,32,20,0.10)]"
                : "border-transparent text-[#3F3F3A] hover:-translate-y-0.5 hover:border-[#D9D1B8] hover:bg-white hover:text-[#050505]"
            }`
          }
        >
          <item.icon className="h-5 w-5" strokeWidth={1.8} />
          <span className="pointer-events-none absolute left-[4.1rem] z-20 hidden rounded-full bg-[#050505] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 lg:block">
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#FFFBEA] text-[#050505]">
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D1B8] bg-white text-[#050505] shadow-[0_18px_50px_rgba(40,32,20,0.08)] lg:hidden"
        onClick={() => setMobileNavOpen((open) => !open)}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileNavOpen && (
        <button className="fixed inset-0 z-40 bg-[#050505]/20 lg:hidden" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />
      )}

      <aside
        className={`fixed inset-y-4 left-4 z-50 flex w-[90px] flex-col items-center justify-between rounded-[32px] border border-[#D9D1B8] bg-white/96 px-3 py-5 shadow-[0_18px_50px_rgba(40,32,20,0.08)] backdrop-blur transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-[130%]"
        }`}
      >
        <button
          type="button"
          onClick={() => navigate(AppRoute.DASHBOARD)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#050505] text-white"
          aria-label="LearnBot dashboard"
        >
          <BookOpen className="h-5 w-5" />
        </button>

        {dock}

        <button
          type="button"
          onClick={handleLogoutClick}
          disabled={isSigningOut}
          className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-[#D9D1B8] bg-white text-[#3F3F3A] transition hover:-translate-y-0.5 hover:text-[#050505] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10 disabled:bg-[#A7A29A] disabled:text-white disabled:opacity-100"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
          <span className="pointer-events-none absolute left-[4.1rem] z-20 hidden rounded-full bg-[#050505] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 lg:block">
            {isSigningOut ? "Signing out" : "Sign out"}
          </span>
        </button>
      </aside>

      <div className="min-h-screen lg:pl-[122px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-end gap-3 bg-[#FFFBEA]/88 px-4 backdrop-blur md:px-8">
          {isChatRoute && (
            <button
              type="button"
              onClick={() => {
                const next = !chatContextCollapsed;
                setChatContextCollapsed(next);
                setBool(CHAT_SIDEBAR_COLLAPSED_KEY, next);
                setBool(CHAT_CONTEXT_COLLAPSED_KEY, next);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#D9D1B8] bg-white px-4 py-2 text-sm font-semibold text-[#3F3F3A] transition hover:-translate-y-0.5 hover:border-[#E6D979] hover:text-[#050505] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#050505]/10"
            >
              <Columns2 className="h-4 w-4" />
              {chatContextCollapsed ? "Show panels" : "Focus"}
            </button>
          )}

          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-[#050505]">{displayName}</p>
            <p className="text-xs font-medium text-[#6B675F]">{user?.email || ""}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D6C8FF] bg-[#EFE7FF] text-sm font-black text-[#050505]">
            {displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
        </header>

        <main className="px-4 pb-8 md:px-8">
          <div className="mx-auto max-w-[92rem]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
