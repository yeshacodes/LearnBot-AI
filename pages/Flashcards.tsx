import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, RotateCw, Sparkles, Undo2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { getDueFlashcards } from "../src/logic/learning";
import { generateDeckFromSources } from "../src/lib/api";
import type { FlashcardReviewRating } from "../types";

type DragState = {
  active: boolean;
  startX: number;
  offsetX: number;
  didDrag: boolean;
};

const SWIPE_THRESHOLD = 120;

const FlashcardsPage: React.FC = () => {
  const data = useLearningData();
  const [searchParams] = useSearchParams();
  const readySources = useMemo(
    () => data.sources.filter((source) => source.status === "ready" && (source.chunkCount ?? 0) > 0),
    [data.sources],
  );
  const initialSourceId = searchParams.get("sourceId");
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => data.flashcardDecks[0]?.id ?? "");
  const [selectedSourceId, setSelectedSourceId] = useState<string>(() =>
    initialSourceId && readySources.some((source) => source.id === initialSourceId) ? initialSourceId : readySources[0]?.id ?? "",
  );
  const [sessionCardIds, setSessionCardIds] = useState<string[]>([]);
  const [reviewedCardIds, setReviewedCardIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [drag, setDrag] = useState<DragState>({ active: false, startX: 0, offsetX: 0, didDrag: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [sessionReviews, setSessionReviews] = useState<Record<FlashcardReviewRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const didDragRef = useRef(false);

  const selectedDeck = data.flashcardDecks.find((deck) => deck.id === selectedDeckId) ?? data.flashcardDecks[0];
  const deckCards = useMemo(
    () => (selectedDeck ? data.flashcards.filter((card) => selectedDeck.cardIds.includes(card.id)) : []),
    [data.flashcards, selectedDeck],
  );
  const deckCardSignature = useMemo(() => deckCards.map((card) => card.id).join("|"), [deckCards]);
  const deckCompletion = deckCards.length
    ? Math.round((deckCards.filter((card) => (card.masteryScore ?? 0) >= 70).length / deckCards.length) * 100)
    : 0;
  const sessionTotal = Object.values(sessionReviews).reduce((sum, count) => sum + count, 0);
  const needsPractice = sessionReviews.again;
  const movedForward = sessionReviews.good + sessionReviews.easy;
  const currentCardId = sessionCardIds.find((id) => !reviewedCardIds.includes(id));
  const currentCard = deckCards.find((card) => card.id === currentCardId);
  const currentPosition = currentCardId ? reviewedCardIds.length + 1 : Math.min(reviewedCardIds.length, sessionCardIds.length);
  const hasCompletedSession = sessionCardIds.length > 0 && !currentCard;
  const swipeIntent = drag.offsetX > 24 ? "right" : drag.offsetX < -24 ? "left" : null;
  const rotate = Math.max(-10, Math.min(10, drag.offsetX / 18));

  useEffect(() => {
    if (selectedSourceId || !readySources.length) return;
    if (initialSourceId && readySources.some((source) => source.id === initialSourceId)) {
      setSelectedSourceId(initialSourceId);
      return;
    }
    setSelectedSourceId(readySources[0].id);
  }, [initialSourceId, readySources, selectedSourceId]);

  useEffect(() => {
    if (!selectedDeck && data.flashcardDecks[0]) {
      setSelectedDeckId(data.flashcardDecks[0].id);
    }
  }, [data.flashcardDecks, selectedDeck]);

  useEffect(() => {
    if (!selectedDeck) {
      setSessionCardIds([]);
      setReviewedCardIds([]);
      setIsFlipped(false);
      return;
    }
    const dueIds = getDueFlashcards(deckCards).map((card) => card.id);
    const nextIds = dueIds.length ? dueIds : [];
    setSessionCardIds(nextIds);
    setReviewedCardIds([]);
    setIsFlipped(false);
    setDrag({ active: false, startX: 0, offsetX: 0, didDrag: false });
  }, [selectedDeck?.id, deckCardSignature]);

  const submitReview = (rating: FlashcardReviewRating) => {
    if (!currentCard) return;
    data.reviewFlashcard(currentCard.id, rating);
    setSessionReviews((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    setReviewedCardIds((prev) => [...prev, currentCard.id]);
    setIsFlipped(false);
    setDrag({ active: false, startX: 0, offsetX: 0, didDrag: false });
  };

  const handleGenerateDeck = async () => {
    if (!selectedSourceId) return;
    const source = readySources.find((item) => item.id === selectedSourceId);
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generated = await generateDeckFromSources(selectedSourceId, 12, "mixed", source ? `${source.name} Deck` : undefined);
      if (!generated.cards.length) {
        throw new Error("No flashcards were generated from this source.");
      }
      data.addGeneratedDeck(generated.deck, generated.cards);
      setSelectedDeckId(generated.deck.id);
      setSessionReviews({ again: 0, hard: 0, good: 0, easy: 0 });
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Flashcard generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isFlipped || !currentCard) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    didDragRef.current = false;
    setDrag({ active: true, startX: event.clientX, offsetX: 0, didDrag: false });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.active) return;
    const offsetX = event.clientX - drag.startX;
    if (Math.abs(offsetX) > 8) didDragRef.current = true;
    setDrag((prev) => ({ ...prev, offsetX, didDrag: prev.didDrag || Math.abs(offsetX) > 8 }));
  };

  const finishDrag = () => {
    if (!drag.active) return;
    const offsetX = drag.offsetX;
    setDrag({ active: false, startX: 0, offsetX: 0, didDrag: drag.didDrag });
    if (offsetX > SWIPE_THRESHOLD) {
      submitReview("good");
      return;
    }
    if (offsetX < -SWIPE_THRESHOLD) {
      submitReview("again");
    }
  };

  const handleCardClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      setDrag((prev) => ({ ...prev, didDrag: false }));
      return;
    }
    if (currentCard) setIsFlipped((flipped) => !flipped);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard) return;
      if (event.code === "Space") {
        event.preventDefault();
        setIsFlipped((flipped) => !flipped);
      }
      if (!isFlipped) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        submitReview("good");
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        submitReview("again");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard?.id, isFlipped]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Flashcards" }]}
        eyebrow="Flashcards"
        title="Review cards"
        description="Flip the card, then swipe or use the buttons to schedule the next review."
        action={<Button icon={isGenerating ? Loader2 : Sparkles} disabled={!selectedSourceId || isGenerating} onClick={handleGenerateDeck}>Generate from source</Button>}
      />

      {generationError && <ErrorState title="Flashcard generation failed" message={generationError} />}
      {isGenerating && <LoadingState label="Generating source-derived flashcards" />}

      {!selectedDeck || deckCards.length === 0 ? (
        <EmptyState
          title="No flashcards yet"
          description="Upload a document and generate your first study deck."
          action={<Button icon={Sparkles} disabled={!selectedSourceId || isGenerating} onClick={handleGenerateDeck}>Generate deck</Button>}
        />
      ) : hasCompletedSession ? (
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold text-primary">Session complete</h2>
          <p className="mt-2 text-sm text-muted">You reviewed {sessionTotal} card{sessionTotal === 1 ? "" : "s"}.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-2xl font-semibold text-rose-700">{needsPractice}</p>
              <p className="mt-1 text-xs font-medium text-rose-700">cards need more practice</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-2xl font-semibold text-emerald-700">{movedForward}</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">cards moved forward</p>
            </div>
          </div>
          <Button className="mt-7" variant="outline" icon={Undo2} onClick={() => {
            setReviewedCardIds([]);
            setIsFlipped(false);
            setSessionReviews({ again: 0, hard: 0, good: 0, easy: 0 });
          }}>
            Review this deck again
          </Button>
        </Card>
      ) : !currentCard ? (
        <EmptyState
          title="No cards due"
          description="This deck is caught up. Generate a new deck or come back when the next reviews are due."
          action={<Button variant="outline" icon={Sparkles} disabled={!selectedSourceId || isGenerating} onClick={handleGenerateDeck}>Generate deck</Button>}
        />
      ) : (
        <section className="mx-auto flex max-w-4xl flex-col items-center">
          <div className="mb-5 w-full text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">{selectedDeck.name}</h2>
            <p className="mt-2 text-sm text-muted">Card {currentPosition} of {sessionCardIds.length}</p>
          </div>

          <div key={currentCard.id} className="relative w-full max-w-3xl touch-pan-y select-none animate-card-enter">
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-6 top-8 z-10 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-opacity ${swipeIntent === "left" ? "opacity-100" : "opacity-0"}`}
            >
              Review again
            </div>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute right-6 top-8 z-10 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition-opacity ${swipeIntent === "right" ? "opacity-100" : "opacity-0"}`}
            >
              Knew it
            </div>

            <button
              type="button"
              aria-label={isFlipped ? "Flashcard answer. Press Space to show question." : "Flashcard question. Press Space to show answer."}
              onClick={handleCardClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              className="min-h-[30rem] w-full rounded-2xl border border-default bg-white p-8 text-left shadow-[0_24px_72px_-48px_rgba(15,23,42,0.34)] transition-transform duration-200 hover:border-indigo-200 hover:shadow-[0_28px_80px_-50px_rgba(15,23,42,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15 sm:p-12 dark:bg-surface"
              style={{
                transform: `translateX(${drag.offsetX}px) rotate(${rotate}deg)`,
                transitionDuration: drag.active ? "0ms" : "200ms",
              }}
            >
              <div className="perspective-1000 min-h-[24rem]">
                <div
                  className="relative min-h-[24rem] transition-transform duration-500 preserve-3d"
                  style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center backface-hidden">
                    <p className="text-sm font-medium text-muted">Question</p>
                    <p className="mt-6 max-w-2xl text-3xl font-semibold leading-tight text-primary md:text-4xl">
                      {currentCard.question}
                    </p>
                  </div>
                  <div className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center text-center backface-hidden">
                    <p className="text-sm font-medium text-muted">Answer</p>
                    <p className="mt-6 max-w-2xl text-2xl font-semibold leading-9 text-primary md:text-3xl">
                      {currentCard.answer}
                    </p>
                    {currentCard.sourceExcerpt && (
                      <p className="mt-8 max-w-2xl rounded-xl border border-default bg-slate-50 p-4 text-sm leading-6 text-muted dark:bg-white/5">
                        Source: {currentCard.sourceExcerpt}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 w-full max-w-3xl">
            <div className="h-2 overflow-hidden rounded-full bg-surface2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(currentPosition / sessionCardIds.length) * 100}%` }} />
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              {isFlipped ? "Swipe right if you knew it, left to review again." : "Tap the card or press Space to reveal the answer."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button variant="outline" icon={RotateCw} disabled={!isFlipped} onClick={() => submitReview("again")}>Review again</Button>
              <Button variant="primary" icon={CheckCircle2} disabled={!isFlipped} onClick={() => submitReview("good")}>I knew it</Button>
            </div>
          </div>

          <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs font-medium text-muted">Deck</p>
              <div className="mt-2 flex flex-wrap gap-2" role="listbox" aria-label="Flashcard decks">
                {data.flashcardDecks.slice(0, 4).map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    aria-selected={selectedDeck?.id === deck.id}
                    onClick={() => setSelectedDeckId(deck.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 ${
                      selectedDeck?.id === deck.id ? "border-indigo-200 bg-indigo-50 text-primary dark:bg-indigo-400/10" : "border-default bg-white text-muted hover:border-indigo-200 hover:text-primary dark:bg-white/5"
                    }`}
                  >
                    {deck.name}
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted">Source</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {readySources.slice(0, 3).map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    aria-pressed={selectedSourceId === source.id}
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 ${
                      selectedSourceId === source.id ? "border-indigo-200 bg-indigo-50 text-primary dark:bg-indigo-400/10" : "border-default bg-white text-muted hover:border-indigo-200 hover:text-primary dark:bg-white/5"
                    }`}
                  >
                    {source.name}
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted">Session</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-primary">{sessionTotal}</p>
                  <p className="text-xs text-muted">Reviewed</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-700">{movedForward}</p>
                  <p className="text-xs text-muted">Known</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-rose-700">{needsPractice}</p>
                  <p className="text-xs text-muted">Review</p>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};

export default FlashcardsPage;
