
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
        <div className="flex flex-col h-full bg-sidebar dark:bg-[#121212] dark:bg-gradient-to-b dark:from-[#191919] dark:to-[#121212] rounded-[3rem] border-[4px] border-default shadow-brutal-lg">
          {/* Logo */}
          <div className="flex items-center justify-between h-28 px-8">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="hidden lg:inline-flex p-2 text-primary dark:text-[#F3F4F6] hover:text-black dark:hover:text-[#00E5FF] hover:bg-yellow dark:hover:bg-[#1E1E1E] border-[3px] border-transparent hover:border-default dark:hover:border-transparent rounded-xl transition-colors"
                onClick={() => setBool(NAV_COLLAPSED_KEY, true)}
                aria-label="Hide sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-[1.65rem] leading-none font-heading font-black text-primary uppercase tracking-tight whitespace-nowrap">
                Learn<span className="text-accent dark:text-[#FF4FA3]">Bot</span>
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
                  group flex items-center gap-4 px-6 py-4 rounded-[1.8rem] transition-all duration-300 border-[3px] border-transparent
                  ${isActive 
                    ? 'bg-accent dark:bg-[#FF4FA3] text-black font-black border-default shadow-[4px_4px_0px_0px_var(--shadow)] dark:shadow-[4px_4px_0px_0px_#000] translate-x-1' 
                    : 'text-primary dark:text-[#F3F4F6] hover:bg-accent/10 dark:hover:bg-[#1E1E1E] hover:text-accent dark:hover:text-[#00E5FF] hover:border-accent/50 dark:hover:border-transparent'}
                `}
              >
                <item.icon className="w-5 h-5 transition-transform group-hover:scale-110 text-current" />
                <span className="text-[12px] font-black uppercase tracking-[0.15em] text-current">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Section Bottom */}
          <div className="p-6">
            <button 
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="flex items-center justify-center gap-3 w-full px-5 py-5 bg-card dark:bg-[#151515] text-primary dark:text-white hover:text-black dark:hover:text-white hover:bg-yellow dark:hover:bg-[#222222] border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] rounded-[1.8rem] shadow-[4px_4px_0px_0px_var(--shadow)] dark:shadow-none hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-brutal dark:hover:shadow-none transition-all font-black uppercase tracking-widest text-[11px]"
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
            className={`${navCollapsed ? 'inline-flex' : 'lg:hidden'} p-3 bg-card rounded-2xl text-primary border-[3px] border-default shadow-sm`}
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
                  className="inline-flex items-center gap-2 px-3 py-2 bg-card dark:bg-[#151515] text-primary dark:text-[#F3F4F6] hover:text-black dark:hover:text-[#00E5FF] hover:bg-yellow dark:hover:bg-[#1E1E1E] border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] rounded-xl hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-sm dark:shadow-none dark:hover:shadow-none transition-all text-[11px] font-black uppercase tracking-widest"
                >
                  <Columns2 className="w-4 h-4 text-current" />
                  {chatContextCollapsed ? 'Show Chat Panels' : 'Focus Chat'}
                </button>
              </div>
            )}
            <button
              onClick={handleLogoutClick}
              disabled={isSigningOut}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-card dark:bg-[#151515] text-primary dark:text-white hover:text-black dark:hover:text-white border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] rounded-xl hover:bg-yellow dark:hover:bg-[#222222] hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-[4px_4px_0px_0px_var(--shadow)] dark:shadow-none dark:hover:shadow-none transition-all font-black uppercase tracking-widest text-[11px]"
            >
              <LogOut className="w-4 h-4 text-current" />
              {isSigningOut ? 'Signing Out...' : 'Sign Out'}
            </button>
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-black text-primary dark:text-white tracking-tighter">{displayName}</span>
              <span className="text-[11px] text-primary/70 dark:text-white font-black tracking-[0.02em]">{user?.email || ''}</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-secondary border-[3px] border-default shadow-[4px_4px_0px_0px_var(--shadow)] flex items-center justify-center text-black overflow-hidden hover:-translate-y-1 transition-transform">
              <span className="text-xl font-heading font-black">{displayName?.[0]?.toUpperCase() ?? "U"}</span>
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
