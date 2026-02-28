
export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

export type SourceType = 'pdf' | 'url';

export type Source = {
  id: string;
  name: string;
  type: SourceType;
  date: string;
  status: 'ready' | 'processing' | 'error';
  url?: string;
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

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
};

export enum AppRoute {
  LOGIN = '/login',
  REGISTER = '/register',
  UPLOAD = '/app/upload',
  CHAT = '/app/chat',
  FLASHCARDS = '/app/flashcards',
  SOURCES = '/app/sources',
  SETTINGS = '/app/settings',
}
