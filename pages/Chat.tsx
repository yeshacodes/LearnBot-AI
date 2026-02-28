
import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, Sparkles } from 'lucide-react';
import { Card, Badge } from '../components/Common';
import { Message, Source } from '../types';
import { apiFetch, normalizeSources, parseSourcesList } from '../src/lib/api';
import { getBool, setBool } from '../src/lib/uiPrefs';

const CHAT_SIDEBAR_COLLAPSED_KEY = "learnbot_chat_sidebar_collapsed";
const CHAT_CONTEXT_COLLAPSED_KEY = "learnbot_chat_context_collapsed";

function getInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const hasSavedPref = window.localStorage.getItem(CHAT_SIDEBAR_COLLAPSED_KEY) !== null;
  if (!hasSavedPref && window.innerWidth < 768) return true;
  return getBool(CHAT_SIDEBAR_COLLAPSED_KEY, false);
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome. I've synced your knowledge bank. How can I assist with your study today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => getInitialSidebarCollapsed());
  const [contextCollapsed, setContextCollapsed] = useState<boolean>(() => getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSidebarHidden = sidebarCollapsed || contextCollapsed;

  async function fetchSources() {
    setSourcesLoading(true);
    setSourcesError(null);

    try {
      const res = await apiFetch('/api/sources', { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load sources (${res.status}): ${text}`);
      }

      const json = await res.json();
      const rawList = parseSourcesList(json);
      const normalized = normalizeSources(rawList);
      setSources(normalized);
    } catch (e: any) {
      setSourcesError(`Failed to load sources: ${e?.message ?? "Unknown error"}`);
    } finally {
      setSourcesLoading(false);
    }
  }

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setChatError(null);

    try {
      const sourceIds = selectedSourceIds.length > 0
        ? selectedSourceIds
        : sources.map((s) => s.id);
      const res = await apiFetch('/api/chat', {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMsg.content,
          sourceIds,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Chat failed (${res.status}): ${text}`);
      }

      const response = await res.json();
      const assistantMsg: Message = {
        id: String(response.answer_id ?? Date.now() + 1),
        role: 'assistant',
        content: String(response.answer ?? "I apologize, I couldn't process that."),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setChatError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    setBool(CHAT_SIDEBAR_COLLAPSED_KEY, sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    setBool(CHAT_CONTEXT_COLLAPSED_KEY, contextCollapsed);
  }, [contextCollapsed]);

  useEffect(() => {
    const onPrefsChanged = () => {
      setSidebarCollapsed(getBool(CHAT_SIDEBAR_COLLAPSED_KEY, false));
      setContextCollapsed(getBool(CHAT_CONTEXT_COLLAPSED_KEY, false));
    };
    window.addEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
    return () => window.removeEventListener("ui-prefs-changed", onPrefsChanged as EventListener);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-160px)] gap-6">
      {/* Sidebar Sources - Minimalist Pastel */}
      <div
        className={`hidden md:flex flex-col gap-6 overflow-hidden transition-[width,opacity] duration-200 ease-in-out ${
          isSidebarHidden ? 'w-0 opacity-0 pointer-events-none' : 'w-72 opacity-100'
        }`}
      >
        <div className="w-72">
          <h3 className="text-[11px] font-black text-muted uppercase tracking-[0.25em] px-4">Active Context</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <button
              onClick={() => setSelectedSourceIds([])}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-left transition-all duration-300 ${selectedSourceIds.length === 0
                ? 'bg-card text-primary shadow-lg shadow-accent/20 border border-default'
                : 'bg-card/70 text-muted hover:bg-surface2 border border-transparent'}`}
            >
              <div className={`p-2 rounded-xl ${selectedSourceIds.length === 0 ? 'bg-surface2' : 'bg-surface2/80'}`}>
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <span className="text-[11px] font-black truncate uppercase tracking-widest">All Sources</span>
            </button>
            {sources.map(source => (
              <button
                key={source.id}
                onClick={() => toggleSourceSelection(source.id)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.8rem] text-left transition-all duration-300 ${selectedSourceIds.includes(source.id)
                  ? 'bg-card text-primary shadow-lg shadow-accent/20 border border-default' 
                  : 'bg-card/70 text-muted hover:bg-surface2 border border-transparent'}`}
              >
                <div className={`p-2 rounded-xl ${selectedSourceIds.includes(source.id) ? 'bg-surface2' : 'bg-surface2/80'}`}>
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] font-black truncate uppercase tracking-widest">{source.name}</span>
              </button>
            ))}
            {sourcesLoading && <div className="px-4 text-[11px] text-muted font-bold uppercase tracking-widest">Loading sources...</div>}
            {sourcesError && <div className="px-4 text-[11px] font-bold" style={{ color: "red" }}>{sourcesError}</div>}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-12 py-6 custom-scrollbar scroll-smooth">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'flex flex-col items-end' : 'flex gap-5'}`}>
                <div className={`
                  px-8 py-5 rounded-[2.5rem] shadow-sm font-medium text-[15px] leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-accent text-white rounded-tr-none border border-accent' 
                    : 'bg-surface2 text-primary rounded-tl-none border border-default shadow-inner'}
                `}>
                  {msg.content}
                </div>
                <p className="text-[9px] font-black text-muted uppercase tracking-widest mt-2 px-4 opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-surface2 px-8 py-5 rounded-[2.5rem] rounded-tl-none border border-default">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
              </div>
            </div>
          )}
        </div>

        {/* Input Bar - White and Soft Neutrals */}
        <div className="pt-8">
          <div
            className={`mb-4 px-2 overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${
              contextCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-60 opacity-100'
            }`}
          >
            <Card className="p-4 border border-default !rounded-[1.8rem]">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">
                Sources for this chat
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source) => (
                  <button
                    key={`picker-${source.id}`}
                    onClick={() => toggleSourceSelection(source.id)}
                    className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      selectedSourceIds.includes(source.id)
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface2 text-muted border-default'
                    }`}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-bold text-muted mt-3">If none selected, all sources are used.</p>
            </Card>
          </div>
          {chatError && <div className="px-3 pb-3 text-sm" style={{ color: "red" }}>{chatError}</div>}
          <Card className="p-2 border-none !bg-card backdrop-blur-3xl shadow-2xl shadow-black/10 !rounded-[2.8rem]">
            <div className="flex items-center gap-3 p-1">
              <input 
                placeholder="Ask your assistant anything..." 
                className="flex-1 px-8 py-5 bg-transparent text-primary placeholder:text-muted outline-none font-bold text-sm"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isLoading}
              />
              <button 
                onClick={handleSendMessage} 
                className={`p-5 rounded-[2.2rem] transition-all ${!inputValue.trim() || isLoading ? 'bg-surface2 text-muted' : 'bg-accent text-white hover:scale-105 active:scale-95 shadow-md shadow-accent/30'}`}
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;

