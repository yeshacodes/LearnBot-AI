import React, { useMemo, useState } from "react";
import { Brain, CheckCircle2, Flame, Layers, RotateCw, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { calculateReviewStreak, getDueFlashcards } from "../src/logic/learning";
import type { FlashcardReviewRating } from "../types";

const ratingConfig: Array<{ key: FlashcardReviewRating; label: string; variant: "danger" | "soft" | "secondary" | "primary" }> = [
  { key: "again", label: "Again", variant: "danger" },
  { key: "hard", label: "Hard", variant: "soft" },
  { key: "good", label: "Good", variant: "secondary" },
  { key: "easy", label: "Easy", variant: "primary" },
];

const FlashcardsPage: React.FC = () => {
  const data = useLearningData();
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() => data.flashcardDecks[0]?.id ?? "");
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});
  const [sessionReviews, setSessionReviews] = useState<Record<FlashcardReviewRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const selectedDeck = data.flashcardDecks.find((deck) => deck.id === selectedDeckId) ?? data.flashcardDecks[0];
  const deckCards = useMemo(
    () => (selectedDeck ? data.flashcards.filter((card) => selectedDeck.cardIds.includes(card.id)) : []),
    [data.flashcards, selectedDeck],
  );
  const dueCards = useMemo(() => getDueFlashcards(data.flashcards), [data.flashcards]);
  const averageMastery = data.flashcards.length
    ? Math.round(data.flashcards.reduce((sum, card) => sum + (card.masteryScore ?? 0), 0) / data.flashcards.length)
    : 0;
  const deckCompletion = deckCards.length
    ? Math.round((deckCards.filter((card) => (card.masteryScore ?? 0) >= 70).length / deckCards.length) * 100)
    : 0;
  const reviewStreak = useMemo(
    () => calculateReviewStreak(data.flashcardReviews.map((review) => review.reviewedAt)),
    [data.flashcardReviews],
  );
  const sessionTotal = Object.values(sessionReviews).reduce((sum, count) => sum + count, 0);

  const review = (cardId: string, rating: FlashcardReviewRating) => {
    data.reviewFlashcard(cardId, rating);
    setSessionReviews((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    setFlippedCardIds((prev) => ({ ...prev, [cardId]: false }));
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Flashcards" }]}
        eyebrow="Flashcards"
        title="Spaced repetition"
        description="Review by deck, flip each card, and schedule the next review with a confidence rating."
        action={<Button icon={Sparkles} disabled={!data.sources[0]} onClick={() => data.sources[0] && data.createDeckFromSource(data.sources[0].id)}>Generate from latest source</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Decks" value={String(data.flashcardDecks.length)} detail="Saved study sets" icon={Layers} accent="purple" />
        <StatCard title="Due today" value={String(dueCards.length)} detail="Ready for review" icon={Brain} accent="orange" />
        <StatCard title="Mastery" value={`${averageMastery}%`} detail="Average card strength" icon={CheckCircle2} accent="green" />
        <StatCard title="Review streak" value={`${reviewStreak} day${reviewStreak === 1 ? "" : "s"}`} detail="From completed reviews" icon={Flame} accent="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-5">
          <div className="flex flex-wrap gap-2" role="listbox" aria-label="Flashcard decks">
            {data.flashcardDecks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                aria-selected={selectedDeck?.id === deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${selectedDeck?.id === deck.id ? "bg-accent text-white" : "bg-surface2 text-primary hover:bg-accent/10"}`}
              >
                {deck.name}
              </button>
            ))}
            {!data.flashcardDecks.length && <span className="text-sm font-medium text-muted">No decks yet.</span>}
          </div>
          {selectedDeck && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm font-bold">
                <span className="text-primary">Deck completion</span>
                <span className="text-muted">{deckCompletion}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${deckCompletion}%` }} />
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-bold text-primary">Session summary</h2>
          <p className="mt-2 text-sm font-medium text-muted">{sessionTotal} cards reviewed this session</p>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {ratingConfig.map((rating) => (
              <div key={rating.key} className="rounded-2xl bg-surface2 p-3 text-center">
                <p className="text-lg font-bold text-primary">{sessionReviews[rating.key]}</p>
                <p className="text-xs font-semibold text-muted">{rating.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {!selectedDeck || deckCards.length === 0 ? (
        <EmptyState title="No flashcards yet" description="Generate a deck from a source or create cards from a chat answer." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {deckCards.map((card) => {
            const flipped = !!flippedCardIds[card.id];
            return (
              <Card key={card.id} className="flex min-h-[23rem] flex-col p-6" interactive>
                <div className="flex items-center justify-between gap-3">
                  <Badge color="purple">{card.tags[0] ?? "Study"}</Badge>
                  <Badge color={(card.masteryScore ?? 0) >= 75 ? "green" : (card.masteryScore ?? 0) >= 40 ? "orange" : "red"}>
                    {card.masteryScore ?? 0}% mastery
                  </Badge>
                </div>
                <button
                  type="button"
                  aria-label={flipped ? "Show question" : "Show answer"}
                  onClick={() => setFlippedCardIds((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                  className="mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl bg-surface2 p-6 text-center transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                >
                  <RotateCw className="mb-5 h-6 w-6 text-accent" />
                  <p className="text-lg font-bold leading-8 text-primary">{flipped ? card.answer : card.question}</p>
                </button>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ratingConfig.map((rating) => (
                    <Button
                      key={rating.key}
                      variant={rating.variant}
                      className="min-h-10 px-2 py-2 text-xs"
                      onClick={() => review(card.id, rating.key)}
                    >
                      {rating.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-4 text-xs font-semibold text-muted">
                  Reviews: {card.reviewCount ?? 0} · Next: {card.nextReviewDate ? new Date(card.nextReviewDate).toLocaleDateString() : "today"}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlashcardsPage;
