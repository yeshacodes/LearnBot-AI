
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  MessageSquare, 
  Layers, 
  Database, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Columns2,
  LayoutDashboard,
  CircleHelp
} from 'lucide-react';
import { AppRoute } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { getBool, setBool } from '../src/lib/uiPrefs';
import { supabase } from '../src/lib/supabase';

const CHAT_SIDEBAR_COLLAPSED_KEY = "learnbot_chat_sidebar_collapsed";
const CHAT_CONTEXT_COLLAPSED_KEY = "learnbot_chat_context_collapsed";
const NAV_COLLAPSED_KEY = "learnbot_nav_collapsed";

const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [chatContextCollapsed, setChatContextCollapsed] = useState<boolean>(() => getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => getBool(NAV_COLLAPSED_KEY, false));
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === AppRoute.CHAT;
  const displayName =
    profileDisplayName ||
    (user?.email ? user.email.split("@")[0] : "User");

  const navItems = [
    { label: 'Dashboard', path: AppRoute.DASHBOARD, icon: LayoutDashboard },
    { label: 'Upload', path: AppRoute.UPLOAD, icon: Upload },
    { label: 'Assistant', path: AppRoute.CHAT, icon: MessageSquare },
    { label: 'Quiz', path: AppRoute.QUIZ, icon: CircleHelp },
    { label: 'Memory', path: AppRoute.FLASHCARDS, icon: Layers },
    { label: 'Sources', path: AppRoute.SOURCES, icon: Database },
    { label: 'Settings', path: AppRoute.SETTINGS, icon: Settings },
  ];

  const handleLogoutClick = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    const onPrefsChanged = () => {
      setChatContextCollapsed(getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
      setNavCollapsed(getBool(NAV_COLLAPSED_KEY, false));
    };
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
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setProfileDisplayName(null);
        return;
      }
      setProfileDisplayName(data?.display_name ?? null);
    };
    loadProfileName();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="flex min-h-screen text-primary">
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 p-6
        transition-all duration-200 ease-in-out transform lg:translate-x-0 lg:static lg:inset-0
        ${navCollapsed ? 'lg:w-0 lg:p-0 lg:opacity-0 lg:overflow-hidden' : 'lg:w-72 lg:p-6 lg:opacity-100'}
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full rounded-[2rem] border border-white/60 bg-card shadow-[12px_12px_36px_var(--shadow),-10px_-10px_30px_rgba(255,255,255,0.45)] backdrop-blur-xl dark:border-white/10 dark:shadow-[14px_14px_42px_rgba(0,0,0,0.32)]">
          {/* Logo */}
          <div className="flex items-center justify-between h-28 px-8">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="hidden rounded-xl p-2 text-primary transition-colors hover:bg-surface2 hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 lg:inline-flex"
                onClick={() => setBool(NAV_COLLAPSED_KEY, true)}
                aria-label="Hide sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-[1.65rem] leading-none font-heading font-bold text-primary tracking-tight whitespace-nowrap">
                Learn<span className="text-accent dark:text-[#FF4FA3]">Bot</span>
              </span>
            </div>
            <button className="rounded-xl p-2 text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-4 custom-scrollbar" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25
                  ${isActive 
                    ? 'bg-accent text-white font-bold shadow-[0_18px_38px_-24px_color-mix(in_oklab,var(--accent)_80%,transparent)]' 
                    : 'text-primary hover:bg-surface2 hover:text-accent'}
                `}
              >
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 text-current" />
                <span className="text-sm font-bold text-current">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Section Bottom */}
          <div className="p-6">
            <button 
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-surface2 px-5 py-4 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
            >
              <LogOut className="w-4 h-4 text-current" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-28 flex items-center justify-between px-10">
          <button 
            className={`${navCollapsed ? 'inline-flex' : 'lg:hidden'} rounded-2xl bg-card p-3 text-primary shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25`}
            onClick={() => {
              if (navCollapsed) {
                setBool(NAV_COLLAPSED_KEY, false);
                return;
              }
              setIsSidebarOpen(true);
            }}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center ml-auto gap-6">
            {isChatRoute && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !chatContextCollapsed;
                    setChatContextCollapsed(next);
                    setBool(CHAT_SIDEBAR_COLLAPSED_KEY, next);
                    setBool(CHAT_CONTEXT_COLLAPSED_KEY, next);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-surface2 hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                >
                  <Columns2 className="w-4 h-4 text-current" />
                  {chatContextCollapsed ? 'Show Chat Panels' : 'Focus Chat'}
                </button>
              </div>
            )}
            <button
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="hidden items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-surface2 hover:text-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 sm:inline-flex"
            >
              <LogOut className="w-4 h-4 text-current" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-primary">{displayName}</span>
              <span className="text-xs font-semibold text-muted">{user?.email || ''}</span>
            </div>
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-[#10212b] shadow-[0_16px_30px_-22px_var(--shadow)] transition-transform hover:-translate-y-0.5">
              <span className="text-xl font-heading font-bold">{displayName?.[0]?.toUpperCase() ?? "U"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
