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
  QuizDifficulty,
  QuizQuestion,
  Source,
  SourceType,
  StudyGoal,
} from "../../types";
import { buildLocalSourceSummary } from "../services/aiService";
import { calculateMasteryScore, calculateNextReviewDate } from "../logic/learning";
import { useAuth } from "./AuthContext";

type LearningState = {
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
  reviewFlashcard: (flashcardId: string, rating: FlashcardReviewRating) => void;
  saveQuizAttempt: (quizId: string, answers: Record<string, number>, questions: QuizQuestion[]) => QuizAttempt;
  createChatSession: (sourceIds?: string[]) => ChatSession;
  addChatMessage: (sessionId: string, message: Omit<ChatMessage, "id" | "timestamp">) => ChatMessage;
  saveMessageAsNote: (sessionId: string, messageId: string) => void;
  createFlashcardsFromMessage: (sessionId: string, messageId: string) => void;
};

const STORAGE_VERSION = "v2";
const LearningDataContext = createContext<LearningDataValue | undefined>(undefined);

const nowIso = () => new Date().toISOString();
const newId = (prefix: string) =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`;

const baseQuestions: QuizQuestion[] = [
  {
    id: "q-active-recall",
    topic: "Active Recall",
    difficulty: "easy",
    prompt: "What is the main value of active recall?",
    choices: ["It replaces sleep", "It strengthens retrieval", "It removes the need for notes", "It only works for math"],
    correctChoiceIndex: 1,
    explanation: "Active recall strengthens memory by making your brain retrieve information instead of rereading it passively.",
  },
  {
    id: "q-spacing",
    topic: "Spaced Repetition",
    difficulty: "medium",
    prompt: "Why should difficult cards return sooner?",
    choices: ["They are prettier", "They need more retrieval practice", "They should be archived", "They use fewer tags"],
    correctChoiceIndex: 1,
    explanation: "Lower-confidence cards need shorter review intervals so the memory trace is rebuilt before it fades.",
  },
  {
    id: "q-source-grounding",
    topic: "Source Grounding",
    difficulty: "medium",
    prompt: "What makes an AI study answer more trustworthy?",
    choices: ["More adjectives", "A selected source context", "Longer paragraphs", "No citations"],
    correctChoiceIndex: 1,
    explanation: "Grounding answers in selected sources reduces drift and helps you trace claims back to uploaded material.",
  },
  {
    id: "q-transfer",
    topic: "Transfer",
    difficulty: "hard",
    prompt: "Which activity best tests transfer?",
    choices: ["Copying definitions", "Applying a concept to a new example", "Renaming a deck", "Changing the theme"],
    correctChoiceIndex: 1,
    explanation: "Transfer means using a concept in a new situation, which is deeper than recognition or copying.",
  },
];

function buildInitialState(): LearningState {
  return {
    sources: [],
    materials: [],
    quizQuestions: baseQuestions,
    quizAttempts: [],
    flashcardDecks: [],
    flashcards: [],
    flashcardReviews: [],
    chatSessions: [],
    studyGoals: [],
  };
}

function reviveState(state: LearningState): LearningState {
  return {
    ...state,
    chatSessions: state.chatSessions.map((session) => ({
      ...session,
      messages: session.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      })),
    })),
  };
}

export const LearningDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const storageKey = `learnbot_learning_${STORAGE_VERSION}_${user?.id ?? "guest"}`;
  const [state, setState] = useState<LearningState>(() => {
    if (typeof window === "undefined") return buildInitialState();
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return buildInitialState();
    try {
      return reviveState(JSON.parse(saved) as LearningState);
    } catch {
      return buildInitialState();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      setState(buildInitialState());
      return;
    }
    try {
      setState(reviveState(JSON.parse(saved) as LearningState));
    } catch {
      setState(buildInitialState());
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const value = useMemo<LearningDataValue>(() => {
    const addSource = (input: AddSourceInput) => {
      const concepts = input.type === "url" ? ["Web Research", "Source Evaluation", "Key Claims"] : ["Core Concepts", "Definitions", "Applications"];
      const source: Source = {
        id: newId("source"),
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
      setState((prev) => ({
        ...prev,
        sources: prev.sources.filter((source) => source.id !== sourceId),
        flashcardDecks: prev.flashcardDecks.filter((deck) => deck.sourceId !== sourceId),
        flashcards: prev.flashcards.filter((card) => card.sourceId !== sourceId),
      }));
    };

    const createDeckFromSource = (sourceId: string, name?: string) => {
      const source = state.sources.find((item) => item.id === sourceId);
      if (!source) return null;
      const deckId = newId("deck");
      const concepts = source.keyConcepts?.length ? source.keyConcepts : ["Overview", "Details", "Application"];
      const cards = concepts.slice(0, 6).map((concept) => ({
        id: newId("card"),
        deckId,
        sourceId,
        question: `What should you remember about ${concept} from ${source.name}?`,
        answer: `${concept} is a key idea from ${source.name}. Use the source detail and chat context to refine this placeholder card.`,
        tags: [concept],
        masteryScore: 25,
        nextReviewDate: nowIso(),
        reviewCount: 0,
      }));
      const deck: FlashcardDeck = {
        id: deckId,
        name: name?.trim() || `${source.name} Study Deck`,
        sourceId,
        createdAt: nowIso(),
        cardIds: cards.map((card) => card.id),
      };
      setState((prev) => ({
        ...prev,
        flashcardDecks: [deck, ...prev.flashcardDecks],
        flashcards: [...cards, ...prev.flashcards],
      }));
      return deck;
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
      const nextMessage: ChatMessage = { ...message, id: newId("message"), timestamp: new Date() };
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
        name: `${session?.title ?? "Chat"} Cards`,
        sourceId: message.sourceIds?.[0],
        createdAt: nowIso(),
        cardIds: [],
      };
      const sentences = message.content.split(/[.!?]/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
      const cards: Flashcard[] = (sentences.length ? sentences : [message.content]).map((sentence) => ({
        id: newId("card"),
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
      reviewFlashcard,
      saveQuizAttempt,
      createChatSession,
      addChatMessage,
      saveMessageAsNote,
      createFlashcardsFromMessage,
    };
  }, [state]);

  return <LearningDataContext.Provider value={value}>{children}</LearningDataContext.Provider>;
};

export function useLearningData(): LearningDataValue {
  const ctx = useContext(LearningDataContext);
  if (!ctx) throw new Error("useLearningData must be used within LearningDataProvider");
  return ctx;
}
