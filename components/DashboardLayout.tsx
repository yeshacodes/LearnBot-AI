
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
  Columns2
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
    { label: 'Upload', path: AppRoute.UPLOAD, icon: Upload },
    { label: 'Assistant', path: AppRoute.CHAT, icon: MessageSquare },
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
        <div className="flex flex-col h-full bg-sidebar dark:bg-[var(--surface)] backdrop-blur-3xl rounded-[3rem] border border-default dark:border-[var(--border)] shadow-[0_8px_40px_rgba(17,24,39,0.08)]">
          {/* Logo */}
          <div className="flex items-center justify-between h-28 px-8">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="hidden lg:inline-flex p-2 text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)] rounded-xl transition-colors"
                onClick={() => setBool(NAV_COLLAPSED_KEY, true)}
                aria-label="Hide sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-[1.65rem] leading-none font-black text-primary uppercase tracking-tight whitespace-nowrap">
                Learn<span className="text-accent">Bot</span>
              </span>
            </div>
            <button className="lg:hidden p-2 text-primary" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-300
                  ${isActive 
                    ? 'bg-accent text-white font-black active-nav-shadow translate-x-1' 
                    : 'text-muted hover:text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)]'}
                `}
              >
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="text-[11px] font-black uppercase tracking-[0.15em]">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Section Bottom */}
          <div className="p-6">
            <button 
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="flex items-center justify-center gap-3 w-full px-5 py-5 bg-card dark:bg-[var(--surface)] text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)] border border-default dark:border-[var(--border)] rounded-[1.8rem] transition-all font-black uppercase tracking-widest text-[10px]"
            >
              <LogOut className="w-4 h-4" />
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
            className={`${navCollapsed ? 'inline-flex' : 'lg:hidden'} p-3 bg-card dark:bg-[var(--surface)] rounded-2xl text-primary shadow-sm border border-default dark:border-[var(--border)]`}
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
                  className="inline-flex items-center gap-2 px-3 py-2 bg-card dark:bg-[var(--surface)] text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)] border border-default dark:border-[var(--border)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Columns2 className="w-4 h-4" />
                  {chatContextCollapsed ? 'Show Chat Panels' : 'Focus Chat'}
                </button>
              </div>
            )}
            <button
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-card dark:bg-[var(--surface)] text-primary hover:bg-surface2 dark:hover:bg-[var(--surface2)] border border-default dark:border-[var(--border)] rounded-xl transition-all font-black uppercase tracking-widest text-[10px]"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-black text-primary tracking-tighter">{displayName}</span>
              <span className="text-[10px] text-muted font-black tracking-[0.02em]">{user?.email || ''}</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-card dark:bg-[var(--surface)] border-2 border-default dark:border-[var(--border)] shadow-lg shadow-black/10 flex items-center justify-center text-accent overflow-hidden">
              <span className="text-lg font-black">{displayName?.[0]?.toUpperCase() ?? "U"}</span>
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
