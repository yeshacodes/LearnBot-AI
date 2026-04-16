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
          <h1 className="text-5xl font-heading font-black text-primary dark:text-white tracking-tighter uppercase mb-3">STUDY <span className="text-secondary dark:text-[#00E5FF]">CARDS</span></h1>
          <p className="text-secondary dark:text-[#7FE7F2] font-bold text-[13px] tracking-[0.2em] uppercase">Solidify your memory through recall.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={openDecksModal} className="!rounded-[2rem] !px-8 !py-4 !text-[12px] !uppercase !tracking-widest">
            <Library className="w-5 h-5 mr-3 text-black" />
            My Decks
          </Button>
          <Button onClick={() => setShowGenerateModal(true)} disabled={isGenerating} className="!rounded-[2rem] !px-8 !py-4 !text-[12px] !uppercase !tracking-widest !bg-accent !text-black dark:!bg-[#FF4FA3] dark:hover:!bg-[#ff69b4] transition-transform hover:!-translate-y-[2px]">
            <Sparkles className={`w-5 h-5 mr-3 text-black ${isGenerating ? 'animate-spin' : ''}`} />
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
        <div className="flex items-center justify-between gap-4 bg-card border-[4px] border-default shadow-brutal rounded-[2rem] px-8 py-5">
          <div>
            <p className="text-[12px] font-black text-primary uppercase tracking-widest">Current Deck</p>
            <h2 className="text-2xl font-heading font-black text-primary tracking-tight mt-1">{currentDeck.name}</h2>
            <p className="text-sm text-primary font-bold mt-1">{currentDeck.source_title || 'Custom deck'} · {totalCards} cards</p>
          </div>
          <Badge color="blue">Page {page} / {totalPages}</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loadingCards ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="h-[22rem] animate-pulse !rounded-[3rem]" />
          ))
        ) : cards.length > 0 ? (
          cards.map((card, idx) => (
            <div
              key={card.id}
              className="perspective-1000 h-[22rem] cursor-pointer group animate-in slide-in-from-bottom-6 duration-500"
              style={{ animationDelay: `${idx * 120}ms` }}
              onClick={() => toggleFlip(card.id)}
            >
              <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${flipped[card.id] ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden">
                  <Card className="h-full flex flex-col p-10 bg-card !rounded-[3rem] border-[4px] border-default shadow-brutal group-hover:-translate-y-2 group-hover:shadow-brutal-lg transition-all">
                    <div className="flex justify-between items-center shrink-0 mb-4">
                      <Badge color="blue">Question</Badge>
                      <div className="p-3 bg-card border-[3px] border-default rounded-2xl">
                        <RotateCw className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-2 py-4 overflow-hidden">
                      <p className="text-xl font-bold font-heading text-primary leading-snug uppercase tracking-tight break-words line-clamp-5 w-full">
                        {card.question}
                      </p>
                    </div>
                    <div className="mt-auto shrink-0 min-h-[1.25rem] flex items-center justify-center pt-2 text-transparent select-none">
                    </div>
                  </Card>
                </div>

                <div className="absolute inset-0 backface-hidden rotate-y-180">
                  <Card className="h-full bg-card dark:!bg-[#151515] !rounded-[3rem] border-[4px] dark:border-[1px] border-default dark:border-[#2A2A2A] shadow-brutal dark:shadow-none">
                    <div className="h-full flex flex-col p-10">
                    <div className="flex justify-between items-center shrink-0 mb-4">
                      <Badge color="orange">Answer</Badge>
                      <RotateCw className="w-5 h-5 text-black dark:text-[#F3F4F6]" />
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 custom-scrollbar flex flex-col justify-center text-center">
                      <p className="text-lg font-bold text-black dark:text-white leading-snug italic break-words w-full">
                        &quot;{card.answer}&quot;
                      </p>
                    </div>
                    <div className="mt-auto shrink-0 flex gap-3 pt-2">
                      <button className="flex-1 py-4 bg-card dark:bg-[#1A1A1A] text-primary dark:text-white hover:text-black dark:hover:text-[#00E5FF] rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] hover:-translate-y-1 dark:hover:-translate-y-0 hover:bg-accent/20 dark:hover:bg-[#222222] hover:shadow-brutal dark:shadow-none dark:hover:shadow-none transition-all">Archive</button>
                      <button className="flex-1 py-4 bg-accent dark:bg-[#FF4FA3] text-black rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] dark:shadow-none hover:-translate-y-1 dark:hover:-translate-y-[2px] dark:hover:bg-[#ff69b4] hover:shadow-brutal dark:hover:shadow-none transition-all">Keep</button>
                    </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="p-12 text-center !rounded-[3rem] bg-card dark:!bg-[#111111] border-[4px] dark:border-[2px] border-default dark:border-[#2A2A2A] shadow-brutal dark:shadow-none dark:bg-gradient-to-b dark:from-[#1A1A1A] dark:to-[#111111]">
              <p className="text-2xl font-heading font-black text-primary dark:text-[#FF4FA3] uppercase">NO STUDY CARDS YET</p>
              <p className="text-primary dark:text-white font-bold mt-4">Generate a deck from an uploaded source to get started.</p>
            </Card>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 py-10">
        <button
          onClick={() => currentDeck && page > 1 && fetchDeckCards(currentDeck.id, page - 1)}
          disabled={!currentDeck || page <= 1 || loadingCards}
          className="p-4 bg-card dark:bg-[#151515] text-primary dark:text-white hover:bg-accent/20 dark:hover:bg-[#222222] hover:text-accent dark:hover:text-[#00E5FF] rounded-2xl border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] shadow-brutal dark:shadow-none hover:-translate-y-1 dark:hover:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 hover:shadow-[0_0_0_2px_rgba(0,229,255,0.18)]"
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
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[15px] font-black transition-all border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] dark:shadow-none ${page === pageNumber ? 'bg-accent dark:bg-[#FF4FA3] text-black shadow-brutal translate-x-1 -translate-y-1' : 'bg-card dark:bg-[#151515] text-primary dark:text-white hover:text-accent dark:hover:text-[#00E5FF] hover:bg-accent/20 dark:hover:bg-[#222222] hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-brutal hover:shadow-[0_0_0_2px_rgba(0,229,255,0.18)]'}`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => currentDeck && page < totalPages && fetchDeckCards(currentDeck.id, page + 1)}
          disabled={!currentDeck || page >= totalPages || loadingCards}
          className="p-4 bg-card dark:bg-[#151515] text-primary dark:text-white hover:text-accent dark:hover:text-[#00E5FF] hover:bg-accent/20 dark:hover:bg-[#222222] rounded-2xl border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] shadow-brutal dark:shadow-none hover:-translate-y-1 dark:hover:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 hover:shadow-[0_0_0_2px_rgba(0,229,255,0.18)]"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <Card className="w-full max-w-xl p-8 !rounded-[2.5rem] bg-card border-[4px] border-default shadow-brutal-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-heading font-black text-primary uppercase tracking-tight">Generate Deck</h3>
                <p className="text-primary font-bold text-sm mt-2">Choose a source and create a new flashcard deck.</p>
              </div>
              <button type="button" onClick={() => setShowGenerateModal(false)} className="p-3 rounded-2xl bg-card dark:bg-[#151515] border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] dark:shadow-none text-primary dark:text-white hover:text-black dark:hover:text-[#00E5FF] hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-brutal hover:bg-accent/10 dark:hover:bg-[#222222] transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[12px] font-black text-primary uppercase tracking-[0.2em] ml-2">Source</label>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full mt-2 px-5 py-4 bg-card border-[3px] border-default rounded-xl outline-none text-primary font-bold focus:border-accent"
                  disabled={loadingSources}
                >
                  <option value="">Select a source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>{source.name}</option>
                  ))}
                </select>
                {loadingSources && <p className="text-xs text-primary font-bold mt-2">Loading sources...</p>}
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <Card className="w-full max-w-2xl p-8 !rounded-[2.5rem] bg-card border-[4px] border-default shadow-brutal-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-3xl font-heading font-black text-primary uppercase tracking-tight">My Decks</h3>
                <p className="text-primary font-bold text-sm mt-2">Open an existing deck.</p>
              </div>
              <button type="button" onClick={() => setShowDecksModal(false)} className="p-3 rounded-2xl bg-card dark:bg-[#151515] border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] dark:shadow-none text-primary dark:text-white hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-brutal hover:bg-accent/10 dark:hover:bg-[#222222] hover:text-black dark:hover:text-[#00E5FF] transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingDecks ? (
                <p className="text-sm font-bold text-primary">Loading decks...</p>
              ) : decks.length === 0 ? (
                <p className="text-sm font-bold text-primary">No decks yet.</p>
              ) : (
                decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={async () => {
                      setShowDecksModal(false);
                      await fetchDeckCards(deck.id, 1);
                    }}
                    className="w-full text-left p-6 rounded-[2rem] border-[3px] dark:border-[1px] border-default dark:border-[#2A2A2A] bg-card dark:bg-[#151515] shadow-sm dark:shadow-none hover:-translate-y-1 dark:hover:translate-y-0 hover:shadow-[4px_4px_0px_0px_var(--shadow)] dark:hover:shadow-none transition-all hover:bg-accent/10 dark:hover:bg-[#222222] hover:text-black dark:text-white dark:hover:text-white text-primary group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-heading font-black uppercase tracking-tight group-hover:text-black dark:group-hover:text-[#00E5FF]">{deck.name}</p>
                        <p className="text-xs font-bold mt-1 group-hover:text-black/80">{deck.source_title || 'Custom deck'} · {deck.card_count} cards</p>
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
