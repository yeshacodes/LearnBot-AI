
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  Sparkles,
  Layers3, 
  Library, 
  Settings2, 
  LogOut, 
  Menu, 
  X, 
  Columns2,
  LayoutDashboard,
  Brain
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
    { label: 'Upload', path: AppRoute.UPLOAD, icon: UploadCloud },
    { label: 'Assistant', path: AppRoute.CHAT, icon: Sparkles },
    { label: 'Quiz', path: AppRoute.QUIZ, icon: Brain },
    { label: 'Memory', path: AppRoute.FLASHCARDS, icon: Layers3 },
    { label: 'Sources', path: AppRoute.SOURCES, icon: Library },
    { label: 'Settings', path: AppRoute.SETTINGS, icon: Settings2 },
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
        fixed inset-y-0 left-0 z-50 w-64 p-3
        transition-all duration-200 ease-in-out transform lg:translate-x-0 lg:static lg:inset-0
        ${navCollapsed ? 'lg:w-0 lg:p-0 lg:opacity-0 lg:overflow-hidden' : 'lg:w-64 lg:p-3 lg:opacity-100'}
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col border-r border-default bg-card/85 backdrop-blur-xl">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between px-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 lg:inline-flex"
                onClick={() => setBool(NAV_COLLAPSED_KEY, true)}
                aria-label="Hide sidebar"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="whitespace-nowrap text-xl font-semibold tracking-tight text-primary">
                Learn<span className="bg-gradient-to-r from-pink-500 to-violet-600 bg-clip-text text-transparent">Bot</span>
              </span>
            </div>
            <button className="rounded-lg p-2 text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 custom-scrollbar" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70
                  ${isActive 
                    ? 'active-nav-shadow border border-fuchsia-100 bg-gradient-to-r from-pink-50 to-violet-50 text-primary font-medium' 
                    : 'border border-transparent text-muted hover:-translate-y-0.5 hover:border-fuchsia-100 hover:bg-pink-50/70 hover:text-primary'}
                `}
              >
                <item.icon className="h-4 w-4 text-current" strokeWidth={1.8} />
                <span className="text-sm font-medium text-current">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Section Bottom */}
          <div className="p-3">
            <button 
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-default bg-white/80 px-3 py-2.5 text-sm font-medium text-muted transition-all hover:-translate-y-0.5 hover:bg-pink-50/80 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70"
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
        <header className="flex h-16 items-center justify-between border-b border-default bg-background/80 px-4 backdrop-blur-sm lg:px-8">
          <button 
            className={`${navCollapsed ? 'inline-flex' : 'lg:hidden'} rounded-lg border border-default bg-card/85 p-2 text-muted transition-all hover:-translate-y-0.5 hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70`}
            onClick={() => {
              if (navCollapsed) {
                setBool(NAV_COLLAPSED_KEY, false);
                return;
              }
              setIsSidebarOpen(true);
            }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            {isChatRoute && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !chatContextCollapsed;
                    setChatContextCollapsed(next);
                    setBool(CHAT_SIDEBAR_COLLAPSED_KEY, next);
                    setBool(CHAT_CONTEXT_COLLAPSED_KEY, next);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-default bg-card/85 px-3 py-2 text-sm font-medium text-muted transition-all hover:-translate-y-0.5 hover:bg-pink-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70"
                >
                  <Columns2 className="w-4 h-4 text-current" />
                  {chatContextCollapsed ? 'Show Chat Panels' : 'Focus Chat'}
                </button>
              </div>
            )}
            <button
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="hidden items-center gap-2 rounded-lg border border-default bg-card/85 px-3 py-2 text-sm font-medium text-muted transition-all hover:-translate-y-0.5 hover:bg-pink-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70 sm:inline-flex"
            >
              <LogOut className="w-4 h-4 text-current" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-primary">{displayName}</span>
              <span className="text-xs font-normal text-muted">{user?.email || ''}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-fuchsia-200 bg-gradient-to-br from-pink-100 to-violet-100 text-primary shadow-sm">
              <span className="text-sm font-semibold">{displayName?.[0]?.toUpperCase() ?? "U"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
