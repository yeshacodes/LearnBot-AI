import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  ChatMessage,
  ChatSession,
  Flashcard,
  FlashcardDeck,
  FlashcardReview,
  FlashcardReviewRating,
  Material,
  QuizAttempt,
  QuizQuestion,
  Source,
  SourceType,
  StudyGoal,
} from "../../types";
import { buildLocalSourceSummary } from "../services/aiService";
import { calculateMasteryScore, calculateNextReviewDate } from "../logic/learning";
import { useAuth } from "./AuthContext";
import { API_ROUTES, apiFetch, isBackendSourceId, normalizeSources, parseSourcesList } from "../lib/api";

type LearningState = {
  ownerId: string;
  mode: "authenticated" | "guest";
  sources: Source[];
  materials: Material[];
  quizQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  flashcardDecks: FlashcardDeck[];
  flashcards: Flashcard[];
  flashcardReviews: FlashcardReview[];
  chatSessions: ChatSession[];
  studyGoals: StudyGoal[];
};

type AddSourceInput = {
  name: string;
  type: SourceType;
  url?: string;
  size?: string;
  status?: Source["status"];
};

type LearningDataValue = LearningState & {
  addSource: (input: AddSourceInput) => Source;
  upsertSource: (source: Source, replaceId?: string) => void;
  updateSourceStatus: (sourceId: string, status: Source["status"]) => void;
  updateSource: (sourceId: string, updates: Partial<Source>) => void;
  deleteSource: (sourceId: string) => void;
  createDeckFromSource: (sourceId: string, name?: string) => FlashcardDeck | null;
  setGeneratedQuizQuestions: (questions: QuizQuestion[]) => void;
  addGeneratedDeck: (deck: FlashcardDeck, cards: Flashcard[]) => void;
  reviewFlashcard: (flashcardId: string, rating: FlashcardReviewRating) => void;
  saveQuizAttempt: (quizId: string, answers: Record<string, number>, questions: QuizQuestion[]) => QuizAttempt;
  createChatSession: (sourceIds?: string[]) => ChatSession;
  addChatMessage: (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  saveMessageAsNote: (sessionId: string, messageId: string) => void;
  createFlashcardsFromMessage: (sessionId: string, messageId: string) => void;
};

const STORAGE_VERSION = "v2";
const LearningDataContext = createContext<LearningDataValue | undefined>(undefined);
const LEGACY_DEMO_QUESTION_IDS = new Set(["q-active-recall", "q-spacing", "q-source-grounding", "q-transfer"]);

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`;

const ownerMode = (ownerId: string): LearningState["mode"] => (ownerId === "guest" ? "guest" : "authenticated");

const belongsToOwner = <T extends { ownerId?: string }>(item: T, ownerId: string) => item.ownerId === ownerId;

function withOwner<T extends { ownerId?: string }>(item: T, ownerId: string): T {
  return { ...item, ownerId };
}

function removeSourceReferences(state: LearningState, sourceId: string): LearningState {
  const removedDeckIds = new Set(state.flashcardDecks.filter((deck) => deck.sourceId === sourceId).map((deck) => deck.id));
  const removedCardIds = new Set(
    state.flashcards
      .filter((card) => card.sourceId === sourceId || (card.deckId ? removedDeckIds.has(card.deckId) : false))
      .map((card) => card.id),
  );

  return {
    ...state,
    sources: state.sources.filter((source) => source.id !== sourceId),
    materials: state.materials.filter((material) => material.sourceId !== sourceId),
    quizQuestions: state.quizQuestions.filter((question) => question.sourceId !== sourceId),
    flashcardDecks: state.flashcardDecks.filter((deck) => deck.sourceId !== sourceId),
    flashcards: state.flashcards.filter((card) => !removedCardIds.has(card.id)),
    flashcardReviews: state.flashcardReviews.filter((review) => !removedCardIds.has(review.flashcardId)),
    chatSessions: state.chatSessions.map((session) => ({
      ...session,
      sourceIds: session.sourceIds.filter((id) => id !== sourceId),
      messages: session.messages.map((message) => ({
        ...message,
        sourceIds: message.sourceIds?.filter((id) => id !== sourceId),
      })),
    })),
  };
}

function removeStalePlaceholderSources(state: LearningState): LearningState {
  const staleIds = state.sources
    .filter((source) => source.id.startsWith("source-") && !isBackendSourceId(source.id) && (source.status === "failed" || (source.chunkCount ?? 0) === 0))
    .map((source) => source.id);

  return staleIds.reduce((nextState, sourceId) => removeSourceReferences(nextState, sourceId), state);
}

function buildInitialState(ownerId = "guest"): LearningState {
  return {
    ownerId,
    mode: ownerMode(ownerId),
    sources: [],
    materials: [],
    quizQuestions: [],
    quizAttempts: [],
    flashcardDecks: [],
    flashcards: [],
    flashcardReviews: [],
    chatSessions: [],
    studyGoals: [],
  };
}

function sanitizeOwnedState(state: LearningState, ownerId: string): LearningState {
  if (state.ownerId && state.ownerId !== ownerId) {
    return buildInitialState(ownerId);
  }

  const sources = state.sources.filter((source) => belongsToOwner(source, ownerId));
  const sourceIds = new Set(sources.map((source) => source.id));
  const materials = state.materials.filter((material) => belongsToOwner(material, ownerId) && sourceIds.has(material.sourceId));
  const quizQuestions = state.quizQuestions.filter((question) => belongsToOwner(question, ownerId) && (!question.sourceId || sourceIds.has(question.sourceId)));
  const flashcardDecks = state.flashcardDecks.filter((deck) => belongsToOwner(deck, ownerId) && (!deck.sourceId || sourceIds.has(deck.sourceId)));
  const deckIds = new Set(flashcardDecks.map((deck) => deck.id));
  const flashcards = state.flashcards.filter((card) => belongsToOwner(card, ownerId) && (!card.sourceId || sourceIds.has(card.sourceId)) && (!card.deckId || deckIds.has(card.deckId)));
  const cardIds = new Set(flashcards.map((card) => card.id));

  return {
    ...state,
    ownerId,
    mode: ownerMode(ownerId),
    sources,
    materials,
    quizQuestions,
    quizAttempts: state.quizAttempts.filter((attempt) => belongsToOwner(attempt, ownerId)),
    flashcardDecks,
    flashcards,
    flashcardReviews: state.flashcardReviews.filter((review) => belongsToOwner(review, ownerId) && cardIds.has(review.flashcardId)),
    chatSessions: state.chatSessions
      .filter((session) => belongsToOwner(session, ownerId))
      .map((session) => ({
        ...session,
        sourceIds: session.sourceIds.filter((id) => sourceIds.has(id)),
        messages: session.messages.map((message) => ({
          ...message,
          sourceIds: message.sourceIds?.filter((id) => sourceIds.has(id)),
        })),
      })),
    studyGoals: state.studyGoals.filter((goal) => belongsToOwner(goal, ownerId)),
  };
}

function reviveState(state: LearningState, ownerId: string): LearningState {
  const normalized: LearningState = {
    ...state,
    ownerId: state.ownerId ?? ownerId,
    mode: state.mode ?? ownerMode(ownerId),
    sources: (state.sources ?? []).map((source) => withOwner(source, source.ownerId ?? "")),
    materials: (state.materials ?? []).map((material) => withOwner(material, material.ownerId ?? "")),
    quizQuestions: (state.quizQuestions ?? []).filter((question) => !LEGACY_DEMO_QUESTION_IDS.has(question.id)).map((question) => withOwner(question, question.ownerId ?? "")),
    quizAttempts: (state.quizAttempts ?? []).map((attempt) => withOwner(attempt, attempt.ownerId ?? "")),
    flashcardDecks: (state.flashcardDecks ?? []).map((deck) => withOwner(deck, deck.ownerId ?? "")),
    flashcards: (state.flashcards ?? []).map((card) => withOwner(card, card.ownerId ?? "")),
    flashcardReviews: (state.flashcardReviews ?? []).map((review) => withOwner(review, review.ownerId ?? "")),
    chatSessions: (state.chatSessions ?? []).map((session) => ({
      ...session,
      ownerId: session.ownerId ?? "",
      sourceIds: session.sourceIds ?? [],
      messages: (session.messages ?? []).map((message) => ({
        ...message,
        ownerId: message.ownerId ?? "",
        timestamp: new Date(message.timestamp),
      })),
    })),
    studyGoals: (state.studyGoals ?? []).map((goal) => withOwner(goal, goal.ownerId ?? "")),
  };
  return removeStalePlaceholderSources(sanitizeOwnedState(normalized, ownerId));
}

export const LearningDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const ownerId = user?.id ?? "guest";
  const storageKey = `learnbot_learning_${STORAGE_VERSION}_${ownerId}`;
  const [state, setState] = useState<LearningState>(() => {
    if (typeof window === "undefined") return buildInitialState(ownerId);
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return buildInitialState(ownerId);
    try {
      return reviveState(JSON.parse(saved) as LearningState, ownerId);
    } catch {
      return buildInitialState(ownerId);
    }
  });

  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      setState(buildInitialState(ownerId));
      return;
    }
    try {
      setState(reviveState(JSON.parse(saved) as LearningState, ownerId));
    } catch {
      setState(buildInitialState(ownerId));
    }
  }, [loading, ownerId, storageKey]);

  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [loading, state, storageKey]);

  useEffect(() => {
    if (loading || !user?.id) return;
    let cancelled = false;
    const syncOwnedSources = async () => {
      try {
        const res = await apiFetch(API_ROUTES.sources, { credentials: "include" });
        if (!res.ok) return;
        const payload = await res.json();
        const remoteSources = normalizeSources(parseSourcesList(payload)).map((source) => withOwner(source, ownerId));
        if (cancelled) return;
        const remoteIds = new Set(remoteSources.map((source) => source.id));
        setState((prev) => {
          const localOwnedPlaceholders = prev.sources.filter((source) => source.ownerId === ownerId && !isBackendSourceId(source.id));
          const nextSources = [...remoteSources, ...localOwnedPlaceholders.filter((source) => !remoteIds.has(source.id))];
          const nextState = sanitizeOwnedState({ ...prev, ownerId, mode: ownerMode(ownerId), sources: nextSources }, ownerId);
          return removeStalePlaceholderSources(nextState);
        });
      } catch (error) {
        console.warn("Failed to sync user sources", error);
      }
    };
    void syncOwnedSources();
    return () => {
      cancelled = true;
    };
  }, [loading, ownerId, user?.id]);

  const value = useMemo<LearningDataValue>(() => {
    const addSource = (input: AddSourceInput) => {
      const concepts = input.type === "url" ? ["Web Research", "Source Evaluation", "Key Claims"] : ["Core Concepts", "Definitions", "Applications"];
      const source: Source = {
        id: newId("source"),
        ownerId,
        name: input.name,
        type: input.type,
        url: input.url,
        size: input.size,
        date: new Date().toLocaleDateString(),
        createdAt: nowIso(),
        status: input.status ?? "processing",
        keyConcepts: concepts,
        summary: buildLocalSourceSummary(input.name, concepts),
      };
      setState((prev) => ({ ...prev, sources: [source, ...prev.sources] }));
      return source;
    };

    const updateSourceStatus = (sourceId: string, status: Source["status"]) => {
      setState((prev) => ({
        ...prev,
        sources: prev.sources.map((source) => (source.id === sourceId ? { ...source, status } : source)),
      }));
    };

    const updateSource = (sourceId: string, updates: Partial<Source>) => {
      setState((prev) => ({
        ...prev,
        sources: prev.sources.map((source) => (source.id === sourceId ? { ...source, ...updates } : source)),
      }));
    };

    const upsertSource = (source: Source, replaceId?: string) => {
      setState((prev) => {
        const withoutReplacement = prev.sources.filter((item) => item.id !== source.id && item.id !== replaceId);
        return {
          ...prev,
          sources: [source, ...withoutReplacement],
        };
      });
    };

    const deleteSource = (sourceId: string) => {
      setState((prev) => removeSourceReferences(prev, sourceId));
    };

    const createDeckFromSource = (sourceId: string, name?: string) => {
      void sourceId;
      void name;
      return null;
    };

    const setGeneratedQuizQuestions = (questions: QuizQuestion[]) => {
      setState((prev) => ({ ...prev, quizQuestions: questions.map((question) => withOwner(question, ownerId)) }));
    };

    const addGeneratedDeck = (deck: FlashcardDeck, cards: Flashcard[]) => {
      setState((prev) => {
        const cardIds = cards.map((card) => card.id);
        const nextDeck = { ...deck, ownerId, cardIds };
        const nextCards = cards.map((card) => withOwner(card, ownerId));
        return {
          ...prev,
          flashcardDecks: [nextDeck, ...prev.flashcardDecks.filter((item) => item.id !== nextDeck.id)],
          flashcards: [...nextCards, ...prev.flashcards.filter((card) => !cardIds.includes(card.id))],
        };
      });
    };

    const reviewFlashcard = (flashcardId: string, rating: FlashcardReviewRating) => {
      setState((prev) => {
        const card = prev.flashcards.find((item) => item.id === flashcardId);
        if (!card) return prev;
        const reviewCount = (card.reviewCount ?? 0) + 1;
        const masteryScore = calculateMasteryScore(card.masteryScore ?? 0, rating);
        const nextReviewDate = calculateNextReviewDate(rating, reviewCount);
        const review: FlashcardReview = {
          id: newId("review"),
          ownerId,
          flashcardId,
          rating,
          reviewedAt: nowIso(),
          nextReviewDate,
          masteryScore,
        };
        return {
          ...prev,
          flashcards: prev.flashcards.map((item) =>
            item.id === flashcardId ? { ...item, masteryScore, nextReviewDate, reviewCount, lastReviewedAt: nowIso() } : item,
          ),
          flashcardReviews: [review, ...prev.flashcardReviews],
        };
      });
    };

    const saveQuizAttempt = (quizId: string, answers: Record<string, number>, questions: QuizQuestion[]) => {
      const score = questions.filter((question) => answers[question.id] === question.correctChoiceIndex).length;
      const weakTopics = questions
        .filter((question) => answers[question.id] !== question.correctChoiceIndex)
        .map((question) => question.topic);
      const attempt: QuizAttempt = {
        id: newId("attempt"),
        ownerId,
        quizId,
        answers,
        score,
        total: questions.length,
        completedAt: nowIso(),
        weakTopics: [...new Set(weakTopics)],
      };
      setState((prev) => ({ ...prev, quizAttempts: [attempt, ...prev.quizAttempts] }));
      return attempt;
    };

    const createChatSession = (sourceIds: string[] = []) => {
      const session: ChatSession = {
        id: newId("chat"),
        ownerId,
        title: "New study chat",
        sourceIds,
        messages: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      setState((prev) => ({ ...prev, chatSessions: [session, ...prev.chatSessions] }));
      return session;
    };

    const addChatMessage = (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => {
      const nextMessage: ChatMessage = { ...message, ownerId, id: newId("message"), timestamp: new Date() };
      setState((prev) => ({
        ...prev,
        chatSessions: prev.chatSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title: session.messages.length === 0 && message.role === "user" ? message.content.slice(0, 48) : session.title,
                messages: [...session.messages, nextMessage],
                updatedAt: nowIso(),
              }
            : session,
        ),
      }));
      return nextMessage;
    };

    const saveMessageAsNote = (sessionId: string, messageId: string) => {
      setState((prev) => ({
        ...prev,
        chatSessions: prev.chatSessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === messageId ? { ...message, savedAsNote: true } : message,
                ),
              }
            : session,
        ),
      }));
    };

    const createFlashcardsFromMessage = (sessionId: string, messageId: string) => {
      const session = state.chatSessions.find((item) => item.id === sessionId);
      const message = session?.messages.find((item) => item.id === messageId);
      if (!message) return;
      const deckId = newId("deck");
      const deck: FlashcardDeck = {
        id: deckId,
        ownerId,
        name: `${session?.title ?? "Chat"} Cards`,
        sourceId: message.sourceIds?.[0],
        createdAt: nowIso(),
        cardIds: [],
      };
      const sentences = message.content.split(/[.!?]/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
      const cards: Flashcard[] = (sentences.length ? sentences : [message.content]).map((sentence) => ({
        id: newId("card"),
        ownerId,
        deckId,
        sourceId: message.sourceIds?.[0],
        question: `What is the key idea in: "${sentence.slice(0, 80)}"?`,
        answer: sentence,
        tags: ["Chat"],
        masteryScore: 20,
        nextReviewDate: nowIso(),
        reviewCount: 0,
      }));
      deck.cardIds = cards.map((card) => card.id);
      setState((prev) => ({
        ...prev,
        flashcardDecks: [deck, ...prev.flashcardDecks],
        flashcards: [...cards, ...prev.flashcards],
      }));
    };

    return {
      ...state,
      addSource,
      upsertSource,
      updateSourceStatus,
      updateSource,
      deleteSource,
      createDeckFromSource,
      setGeneratedQuizQuestions,
      addGeneratedDeck,
      reviewFlashcard,
      saveQuizAttempt,
      createChatSession,
      addChatMessage,
      saveMessageAsNote,
      createFlashcardsFromMessage,
    };
  }, [ownerId, state]);

  return <LearningDataContext.Provider value={value}>{children}</LearningDataContext.Provider>;
};

export function useLearningData(): LearningDataValue {
  const ctx = useContext(LearningDataContext);
  if (!ctx) throw new Error("useLearningData must be used within LearningDataProvider");
  return ctx;
}
