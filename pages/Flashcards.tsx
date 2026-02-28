import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, RotateCw, ChevronLeft, ChevronRight, Library, X } from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/Common';
import { Flashcard, Source } from '../types';
import { apiFetch, normalizeSources, parseSourcesList } from '../src/lib/api';

type DeckSummary = {
  id: string;
  name: string;
  source_id?: string | null;
  source_title?: string | null;
  card_count: number;
  created_at: string;
};

type DeckCardsResponse = {
  deck: DeckSummary;
  page: number;
  page_size: number;
  total: number;
  cards: Flashcard[];
};

const PAGE_SIZE = 9;
const FRIENDLY_FETCH_ERROR = 'Unable to load study cards right now. Check your connection and confirm the backend is running.';

const FlashcardsPage: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [sources, setSources] = useState<Source[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [deckName, setDeckName] = useState('');
  const [numCards, setNumCards] = useState('20');
  const [currentDeck, setCurrentDeck] = useState<DeckSummary | null>(null);
  const [page, setPage] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDecksModal, setShowDecksModal] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));

  const reportError = (context: string, err: unknown, fallback: string) => {
    console.error(`[Flashcards] ${context}`, err);
    const message = err instanceof Error ? err.message : fallback;
    setError(message === 'Failed to fetch' ? FRIENDLY_FETCH_ERROR : message);
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchSources = async () => {
    setLoadingSources(true);
    try {
      const res = await apiFetch('/api/sources', { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load sources (${res.status}): ${text}`);
      }
      const data = await res.json();
      const rawList = parseSourcesList(data);
      const normalized = normalizeSources(rawList);
      setSources(normalized);
      if (!selectedSourceId && normalized.length > 0) {
        setSelectedSourceId(normalized[0].id);
      }
    } catch (err) {
      reportError('fetchSources failed', err, 'Failed to load sources');
    } finally {
      setLoadingSources(false);
    }
  };

  const fetchDecks = async () => {
    setLoadingDecks(true);
    try {
      const res = await apiFetch('/api/decks', { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load decks (${res.status}): ${text}`);
      }
      const data = await res.json();
      setDecks(Array.isArray(data?.decks) ? data.decks : []);
    } catch (err) {
      reportError('fetchDecks failed', err, 'Failed to load decks');
    } finally {
      setLoadingDecks(false);
    }
  };

  const fetchDeckCards = async (deckId: string, nextPage: number) => {
    setLoadingCards(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/decks/${deckId}/cards?page=${nextPage}&page_size=${PAGE_SIZE}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load cards (${res.status}): ${text}`);
      }
      const data: DeckCardsResponse = await res.json();
      setCurrentDeck(data.deck);
      setCards(
        data.cards.map((card) => ({
          id: card.id,
          question: card.question,
          answer: card.answer,
          tags: card.tags ?? [],
        })),
      );
      setPage(data.page);
      setTotalCards(data.total);
      setFlipped({});
    } catch (err) {
      reportError('fetchDeckCards failed', err, 'Failed to load cards');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    void fetchSources();
    void fetchDecks();
  }, []);

  const handleGenerate = async () => {
    if (!selectedSourceId) {
      setError('Select a source first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const res = await apiFetch('/api/decks/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: selectedSourceId,
          deck_name: deckName.trim() || undefined,
          num_cards: Number(numCards) || 20,
          difficulty: 'mixed',
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to generate deck (${res.status}): ${text}`);
      }
      const data = await res.json();
      await fetchDecks();
      setShowGenerateModal(false);
      setDeckName('');
      setNumCards('20');
      await fetchDeckCards(data.deck_id, 1);
    } catch (err) {
      reportError('handleGenerate failed', err, 'Failed to generate deck');
    } finally {
      setIsGenerating(false);
    }
  };

  const openDecksModal = async () => {
    setShowDecksModal(true);
    await fetchDecks();
  };

  const handleRetry = async () => {
    setError(null);
    await Promise.all([fetchSources(), fetchDecks()]);
    if (currentDeck) {
      await fetchDeckCards(currentDeck.id, page);
    }
  };

  const selectedSourceName = useMemo(() => {
    return sources.find((source) => source.id === selectedSourceId)?.name || 'Select a source';
  }, [sources, selectedSourceId]);

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-primary tracking-tighter uppercase mb-3">Study Cards</h1>
          <p className="text-muted font-bold text-sm tracking-[0.2em] uppercase">Solidify your memory through recall.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={openDecksModal} className="!rounded-[2rem] !px-8 !py-4 !text-[11px] !uppercase !tracking-widest">
            <Library className="w-5 h-5 mr-3" />
            My Decks
          </Button>
          <Button onClick={() => setShowGenerateModal(true)} disabled={isGenerating} className="!rounded-[2rem] !px-8 !py-4 !text-[11px] !uppercase !tracking-widest !bg-accent !text-white">
            <Sparkles className={`w-5 h-5 mr-3 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Synthesizing...' : 'Smart New'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-6 !rounded-[2rem]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-base font-black text-primary">Unable to load study cards</p>
              <p className="text-sm text-muted mt-1">{error}</p>
            </div>
            <Button variant="secondary" onClick={handleRetry}>Try again</Button>
          </div>
        </Card>
      )}

      {currentDeck && (
        <div className="flex items-center justify-between gap-4 bg-card border border-default rounded-[2rem] px-6 py-4">
          <div>
            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Current Deck</p>
            <h2 className="text-xl font-black text-primary tracking-tight">{currentDeck.name}</h2>
            <p className="text-sm text-muted">{currentDeck.source_title || 'Custom deck'} · {totalCards} cards</p>
          </div>
          <Badge color="blue">Page {page} / {totalPages}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loadingCards ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="h-80 animate-pulse !rounded-[3rem]" />
          ))
        ) : cards.length > 0 ? (
          cards.map((card, idx) => (
            <div
              key={card.id}
              className="perspective-1000 h-80 cursor-pointer group animate-in slide-in-from-bottom-6 duration-500"
              style={{ animationDelay: `${idx * 120}ms` }}
              onClick={() => toggleFlip(card.id)}
            >
              <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped[card.id] ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden">
                  <Card className="h-full flex flex-col p-10 backdrop-blur-xl !rounded-[3rem] border-none shadow-xl shadow-black/10 group-hover:translate-y-[-6px] transition-transform">
                    <div className="flex justify-between items-start mb-8">
                      <Badge color="blue">Question</Badge>
                      <div className="p-3 bg-surface2 rounded-2xl">
                        <RotateCw className="w-4 h-4 text-accent" />
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-center text-center px-2">
                      <p className="text-xl font-black text-primary leading-tight uppercase tracking-tight break-words">
                        {card.question}
                      </p>
                    </div>
                    <div className="mt-6 min-h-[1.25rem] flex items-center justify-center">
                      {card.tags.length > 0 && (
                        <span className="text-[10px] text-muted font-black uppercase tracking-widest">
                          Tags {card.tags.length}
                        </span>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="h-full !bg-surface2 !rounded-[3rem] border-none shadow-2xl shadow-black/10">
                    <div className="h-full flex flex-col p-10">
                    <div className="flex justify-between items-start mb-6">
                      <Badge color="orange">Answer</Badge>
                      <RotateCw className="w-4 h-4 text-muted" />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
                      <div className="min-h-full flex flex-col justify-center text-center">
                        <p className="text-base font-bold text-primary leading-relaxed italic break-words">
                          &quot;{card.answer}&quot;
                        </p>
                      </div>
                    </div>
                    <div className="mt-8 flex gap-3">
                      <button className="flex-1 py-4 bg-card dark:bg-surface text-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-sm border border-default">Archive</button>
                      <button className="flex-1 py-4 bg-accent text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20">Keep</button>
                    </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="p-12 text-center !rounded-[3rem]">
              <p className="text-xl font-black text-primary">No study cards yet</p>
              <p className="text-muted mt-3">Generate a deck from an uploaded source to get started.</p>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 py-10">
        <button
          onClick={() => currentDeck && page > 1 && fetchDeckCards(currentDeck.id, page - 1)}
          disabled={!currentDeck || page <= 1 || loadingCards}
          className="p-4 bg-card text-muted hover:text-primary rounded-2xl shadow-sm border border-default transition-all disabled:opacity-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-4">
          {Array.from({ length: Math.min(totalPages, 3) }).map((_, idx) => {
            const pageNumber = idx + 1;
            return (
              <button
                key={pageNumber}
                onClick={() => currentDeck && fetchDeckCards(currentDeck.id, pageNumber)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${page === pageNumber ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted hover:bg-card hover:text-primary'}`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => currentDeck && page < totalPages && fetchDeckCards(currentDeck.id, page + 1)}
          disabled={!currentDeck || page >= totalPages || loadingCards}
          className="p-4 bg-card text-muted hover:text-primary rounded-2xl shadow-sm border border-default transition-all disabled:opacity-50"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="w-full max-w-xl p-8 !rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Generate Deck</h3>
                <p className="text-muted text-sm mt-1">Choose a source and create a new flashcard deck.</p>
              </div>
              <button type="button" onClick={() => setShowGenerateModal(false)} className="p-3 rounded-2xl hover:bg-surface2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-black text-muted uppercase tracking-[0.2em] ml-2">Source</label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full mt-2 px-5 py-4 bg-card border-2 border-default rounded-2xl outline-none text-primary"
                  disabled={loadingSources}
                >
                  <option value="">Select a source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
                {loadingSources && <p className="text-xs text-muted mt-2">Loading sources...</p>}
              </div>
              <Input label="Deck Name" placeholder={selectedSourceName} value={deckName} onChange={(e) => setDeckName(e.target.value)} />
              <Input label="Number of Cards" type="number" min={1} max={50} value={numCards} onChange={(e) => setNumCards(e.target.value)} />
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !selectedSourceId}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showDecksModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl p-8 !rounded-[2.5rem]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-primary uppercase tracking-tight">My Decks</h3>
                <p className="text-muted text-sm mt-1">Open an existing deck.</p>
              </div>
              <button type="button" onClick={() => setShowDecksModal(false)} className="p-3 rounded-2xl hover:bg-surface2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingDecks ? (
                <p className="text-sm text-muted">Loading decks...</p>
              ) : decks.length === 0 ? (
                <p className="text-sm text-muted">No decks yet.</p>
              ) : (
                decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={async () => {
                      setShowDecksModal(false);
                      await fetchDeckCards(deck.id, 1);
                    }}
                    className="w-full text-left p-5 rounded-[2rem] border border-default bg-card hover:bg-surface2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-primary uppercase tracking-tight">{deck.name}</p>
                        <p className="text-xs text-muted mt-1">{deck.source_title || 'Custom deck'} · {deck.card_count} cards</p>
                      </div>
                      <Badge color="blue">{new Date(deck.created_at).toLocaleDateString()}</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FlashcardsPage;
