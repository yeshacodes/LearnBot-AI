import type {
  ChatSession,
  Flashcard,
  FlashcardReviewRating,
  LearningInsight,
  QuizAttempt,
  QuizQuestion,
  Source,
  StudyGoal,
} from "../../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculateQuizAccuracy(attempts: QuizAttempt[]): number {
  const total = attempts.reduce((sum, attempt) => sum + attempt.total, 0);
  if (!total) return 0;
  const correct = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  return Math.round((correct / total) * 100);
}

export function detectWeakTopics(attempts: QuizAttempt[], questions: QuizQuestion[]): string[] {
  const topicStats = new Map<string, { missed: number; total: number }>();
  const questionById = new Map(questions.map((question) => [question.id, question]));

  attempts.forEach((attempt) => {
    Object.entries(attempt.answers).forEach(([questionId, answerIndex]) => {
      const question = questionById.get(questionId);
      if (!question) return;
      const current = topicStats.get(question.topic) ?? { missed: 0, total: 0 };
      current.total += 1;
      if (answerIndex !== question.correctChoiceIndex) current.missed += 1;
      topicStats.set(question.topic, current);
    });
  });

  return [...topicStats.entries()]
    .filter(([, stats]) => stats.total > 0 && stats.missed / stats.total >= 0.34)
    .sort((a, b) => b[1].missed / b[1].total - a[1].missed / a[1].total)
    .map(([topic]) => topic)
    .slice(0, 4);
}

export function getDueFlashcards(cards: Flashcard[], now = new Date()): Flashcard[] {
  return cards.filter((card) => {
    if (!card.nextReviewDate) return true;
    return new Date(card.nextReviewDate).getTime() <= now.getTime();
  });
}

export function calculateMasteryScore(previousScore: number, rating: FlashcardReviewRating): number {
  const delta = {
    again: -22,
    hard: -7,
    good: 13,
    easy: 24,
  }[rating];
  return Math.max(0, Math.min(100, Math.round(previousScore + delta)));
}

export function calculateNextReviewDate(rating: FlashcardReviewRating, reviewCount: number, now = new Date()): string {
  const intervals = {
    again: 0.25,
    hard: Math.max(1, reviewCount),
    good: Math.max(2, reviewCount * 2),
    easy: Math.max(4, reviewCount * 4),
  };
  return new Date(now.getTime() + intervals[rating] * MS_PER_DAY).toISOString();
}

export function recommendNextAction(params: {
  sources: Source[];
  dueCards: Flashcard[];
  weakTopics: string[];
  accuracy: number;
  chatSessions: ChatSession[];
}): string {
  if (params.sources.length === 0) return "Upload a source so LearnBot can ground your study plan.";
  if (params.dueCards.length > 0) return `Review ${params.dueCards.length} due flashcard${params.dueCards.length === 1 ? "" : "s"}.`;
  if (params.weakTopics.length > 0) return `Take a focused quiz on ${params.weakTopics[0]}.`;
  if (params.accuracy < 75) return "Complete a short mixed quiz to rebuild momentum.";
  if (params.chatSessions.length === 0) return "Ask the AI to summarize your newest source.";
  return "Generate a new quiz from your strongest source and push into harder questions.";
}

export function generateTodayStudyPlan(params: {
  sources: Source[];
  dueCards: Flashcard[];
  weakTopics: string[];
  goals: StudyGoal[];
}): string[] {
  const plan: string[] = [];
  if (params.dueCards.length) plan.push(`Review ${Math.min(params.dueCards.length, 12)} due flashcards.`);
  if (params.weakTopics[0]) plan.push(`Practice ${params.weakTopics[0]} with a medium quiz.`);
  if (params.sources[0]) plan.push(`Ask AI for a concise summary of ${params.sources[0].name}.`);
  if (params.goals[0]) plan.push(`Move "${params.goals[0].title}" forward by one focused step.`);
  if (plan.length === 0) plan.push("Upload one source and create your first study set.");
  return plan.slice(0, 4);
}

export function buildLearningInsights(params: {
  attempts: QuizAttempt[];
  dueCards: Flashcard[];
  weakTopics: string[];
  accuracy: number;
}): LearningInsight[] {
  const now = new Date().toISOString();
  const insights: LearningInsight[] = [];
  if (params.dueCards.length) {
    insights.push({
      id: "due-cards",
      title: "Memory queue is ready",
      body: `${params.dueCards.length} card${params.dueCards.length === 1 ? "" : "s"} are due today.`,
      severity: "info",
      createdAt: now,
    });
  }
  if (params.weakTopics[0]) {
    insights.push({
      id: "weak-topic",
      title: "Weak topic detected",
      body: `${params.weakTopics[0]} is showing up in missed quiz answers.`,
      topic: params.weakTopics[0],
      severity: "warning",
      createdAt: now,
    });
  }
  if (params.attempts.length && params.accuracy >= 85) {
    insights.push({
      id: "accuracy-high",
      title: "Strong quiz accuracy",
      body: "You are ready to raise the difficulty on your next session.",
      severity: "success",
      createdAt: now,
    });
  }
  return insights;
}

export function calculateReviewStreak(reviewDates: string[], now = new Date()): number {
  const days = new Set(reviewDates.map((date) => new Date(date).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateTopicAccuracy(attempts: QuizAttempt[], questions: QuizQuestion[]): Array<{ topic: string; accuracy: number; answered: number }> {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const topicStats = new Map<string, { correct: number; total: number }>();

  attempts.forEach((attempt) => {
    Object.entries(attempt.answers).forEach(([questionId, answerIndex]) => {
      const question = questionById.get(questionId);
      if (!question) return;
      const current = topicStats.get(question.topic) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (answerIndex === question.correctChoiceIndex) current.correct += 1;
      topicStats.set(question.topic, current);
    });
  });

  return [...topicStats.entries()]
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
      answered: stats.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function getRecentActivity(params: {
  sources: Source[];
  attempts: QuizAttempt[];
  reviews: { reviewedAt: string; flashcardId: string }[];
  chats: ChatSession[];
}): Array<{ id: string; label: string; detail: string; date: string }> {
  const sourceItems = params.sources.slice(0, 4).map((source) => ({
    id: `source-${source.id}`,
    label: "Source added",
    detail: source.name,
    date: source.createdAt ?? source.date,
  }));
  const attemptItems = params.attempts.slice(0, 4).map((attempt) => ({
    id: `attempt-${attempt.id}`,
    label: "Quiz completed",
    detail: `${attempt.score}/${attempt.total} correct`,
    date: attempt.completedAt,
  }));
  const reviewItems = params.reviews.slice(0, 4).map((review) => ({
    id: `review-${review.flashcardId}-${review.reviewedAt}`,
    label: "Flashcard reviewed",
    detail: "Spaced repetition updated",
    date: review.reviewedAt,
  }));
  const chatItems = params.chats.slice(0, 4).map((chat) => ({
    id: `chat-${chat.id}`,
    label: "Chat updated",
    detail: chat.title,
    date: chat.updatedAt,
  }));

  return [...sourceItems, ...attemptItems, ...reviewItems, ...chatItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
}
