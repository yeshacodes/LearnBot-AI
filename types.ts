
export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type SourceType = 'pdf' | 'url';
export type SourceStatus = 'processing' | 'ready' | 'failed';

export type Source = {
  id: string;
  name: string;
  type: SourceType;
  date: string;
  createdAt?: string;
  status: SourceStatus;
  url?: string;
  size?: string;
  summary?: string;
  keyConcepts?: string[];
  materialIds?: string[];
  chunkCount?: number;
  extractedTextLength?: number;
  processingError?: string;
};

export type Material = {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  concepts: string[];
  createdAt: string;
};

export type Citation = {
  title: string;
  snippet: string;
  pageNumber?: number;
  section?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
};

export type ChatMessage = Message & {
  sourceIds?: string[];
  savedAsNote?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  sourceIds: string[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type Flashcard = {
  id: string;
  deckId?: string;
  question: string;
  answer: string;
  tags: string[];
  masteryScore?: number;
  nextReviewDate?: string;
  reviewCount?: number;
  lastReviewedAt?: string;
  sourceId?: string;
};

export type FlashcardDeck = {
  id: string;
  name: string;
  sourceId?: string;
  description?: string;
  createdAt: string;
  cardIds: string[];
};

export type FlashcardReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type FlashcardReview = {
  id: string;
  flashcardId: string;
  rating: FlashcardReviewRating;
  reviewedAt: string;
  nextReviewDate: string;
  masteryScore: number;
};

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export type QuizQuestion = {
  id: string;
  topic: string;
  difficulty: QuizDifficulty;
  prompt: string;
  choices: string[];
  correctChoiceIndex: number;
  explanation: string;
  sourceId?: string;
};

export type Quiz = {
  id: string;
  title: string;
  topic: string;
  difficulty: QuizDifficulty | 'mixed';
  questions: QuizQuestion[];
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  answers: Record<string, number>;
  score: number;
  total: number;
  completedAt: string;
  weakTopics: string[];
};

export type LearningInsight = {
  id: string;
  title: string;
  body: string;
  topic?: string;
  severity: 'info' | 'success' | 'warning';
  createdAt: string;
};

export type StudyGoal = {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
  createdAt: string;
};

export enum AppRoute {
  LOGIN = '/login',
  REGISTER = '/register',
  DASHBOARD = '/app/dashboard',
  UPLOAD = '/app/upload',
  CHAT = '/app/chat',
  FLASHCARDS = '/app/flashcards',
  QUIZ = '/app/quiz',
  SOURCES = '/app/sources',
  SETTINGS = '/app/settings',
}
