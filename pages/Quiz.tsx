import React, { useMemo, useState } from "react";
import { Brain, CheckCircle2, Circle, RotateCcw, Target, Trophy } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, SegmentedControl } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { calculateTopicAccuracy } from "../src/logic/learning";
import type { QuizDifficulty, QuizQuestion } from "../types";

const difficulties: Array<QuizDifficulty | "all"> = ["all", "easy", "medium", "hard"];

const Quiz: React.FC = () => {
  const data = useLearningData();
  const topics = useMemo(() => ["All", ...Array.from(new Set(data.quizQuestions.map((question) => question.topic)))], [data.quizQuestions]);
  const [topic, setTopic] = useState("All");
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "all">("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);

  const filteredQuestions = useMemo(() => {
    const filtered = data.quizQuestions.filter((question) => {
      const topicMatch = topic === "All" || question.topic === topic;
      const difficultyMatch = difficulty === "all" || question.difficulty === difficulty;
      return topicMatch && difficultyMatch;
    });
    return filtered.length ? filtered : data.quizQuestions;
  }, [data.quizQuestions, topic, difficulty]);

  const questions = useMemo(() => {
    if (!retryQuestionIds.length) return filteredQuestions;
    const retrySet = new Set(retryQuestionIds);
    const retryQuestions = filteredQuestions.filter((question) => retrySet.has(question.id));
    return retryQuestions.length ? retryQuestions : filteredQuestions;
  }, [filteredQuestions, retryQuestionIds]);

  const topicAccuracy = useMemo(
    () => calculateTopicAccuracy(data.quizAttempts, data.quizQuestions),
    [data.quizAttempts, data.quizQuestions],
  );
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isAnswered = selectedAnswer !== undefined;
  const answeredCount = questions.filter((question) => answers[question.id] !== undefined).length;
  const score = questions.filter((question) => answers[question.id] === question.correctChoiceIndex).length;
  const incorrectQuestions = questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== question.correctChoiceIndex);
  const weakTopics = Array.from(new Set(incorrectQuestions.map((question) => question.topic)));

  const resetQuiz = (clearRetry = true) => {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    if (clearRetry) setRetryQuestionIds([]);
  };

  const chooseAnswer = (answerIndex: number) => {
    if (!currentQuestion || submitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerIndex }));
  };

  const finishQuiz = () => {
    data.saveQuizAttempt("local-practice", answers, questions);
    setSubmitted(true);
  };

  const retryIncorrect = () => {
    const ids = incorrectQuestions.map((question) => question.id);
    setRetryQuestionIds(ids);
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Quiz" }]}
        eyebrow="Quiz"
        title="Practice with feedback"
        description="Filter by topic or difficulty, answer one question at a time, and review performance before retrying."
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedControl
            ariaLabel="Topic filter"
            value={topic}
            onChange={(next) => {
              setTopic(next);
              resetQuiz();
            }}
            options={topics.map((item) => ({ value: item, label: item }))}
          />
          <SegmentedControl
            ariaLabel="Difficulty filter"
            value={difficulty}
            onChange={(next) => {
              setDifficulty(next);
              resetQuiz();
            }}
            options={difficulties.map((item) => ({ value: item, label: item }))}
          />
        </div>
      </Card>

      {!currentQuestion ? (
        <EmptyState title="No questions yet" description="Upload sources and generate quizzes to expand this bank." />
      ) : submitted ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
                  <Trophy className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-3xl font-bold text-primary">Score: {score} / {questions.length}</h2>
                <p className="mt-2 text-sm font-medium text-muted">Accuracy {Math.round((score / questions.length) * 100)}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={RotateCcw} onClick={() => resetQuiz()}>New round</Button>
                <Button variant="soft" icon={Target} disabled={!incorrectQuestions.length} onClick={retryIncorrect}>Retry incorrect</Button>
              </div>
            </div>
            <div className="mt-8 rounded-3xl bg-surface2 p-5">
              <h3 className="font-bold text-primary">Performance summary</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-muted">
                {weakTopics.length ? `Review ${weakTopics.join(", ")} next, then retry only the missed questions.` : "No weak topics this round. Move up a difficulty or review flashcards to retain it."}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold text-primary">Review answers</h3>
            <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {questions.map((question, index) => {
                const answer = answers[question.id];
                const correct = answer === question.correctChoiceIndex;
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setCurrentIndex(index);
                    }}
                    className="w-full rounded-2xl bg-surface2 p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-bold text-primary">{question.prompt}</p>
                      <Badge color={correct ? "green" : "red"}>{correct ? "Correct" : "Missed"}</Badge>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted">Your answer: {answer !== undefined ? question.choices[answer] : "Skipped"}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
          <Card className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge color="purple">{currentQuestion.topic}</Badge>
              <Badge color={currentQuestion.difficulty === "hard" ? "red" : currentQuestion.difficulty === "medium" ? "orange" : "green"}>
                {currentQuestion.difficulty}
              </Badge>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm font-bold text-muted">
              <Brain className="h-5 w-5 text-accent" />
              Question {currentIndex + 1} of {questions.length}
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-9 text-primary">{currentQuestion.prompt}</h2>
            <div className="mt-6 space-y-3">
              {currentQuestion.choices.map((choice, index) => {
                const isCorrect = index === currentQuestion.correctChoiceIndex;
                const isSelected = selectedAnswer === index;
                const reveal = isAnswered;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => chooseAnswer(index)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-3 rounded-3xl border p-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${
                      reveal && isCorrect
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : reveal && isSelected
                          ? "border-rose-300 bg-rose-100 text-rose-800"
                          : "border-white/60 bg-surface2 text-primary hover:-translate-y-0.5"
                    }`}
                  >
                    {reveal && isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    {choice}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div className="mt-6 rounded-3xl bg-surface2 p-5">
                <h3 className="font-bold text-primary">Explanation</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-muted">{currentQuestion.explanation}</p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <Button variant="soft" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}>
                Previous
              </Button>
              {currentIndex === questions.length - 1 ? (
                <Button disabled={answeredCount !== questions.length} onClick={finishQuiz}>Finish quiz</Button>
              ) : (
                <Button disabled={!isAnswered} onClick={() => setCurrentIndex((index) => Math.min(questions.length - 1, index + 1))}>
                  Next question
                </Button>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-primary">Progress</h3>
              <div className="mt-5 grid grid-cols-5 gap-2">
                {questions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`Go to question ${index + 1}`}
                    className={`h-10 rounded-2xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25 ${index === currentIndex ? "bg-accent text-white" : answers[question.id] !== undefined ? "bg-green text-[#10212b]" : "bg-surface2 text-muted"}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-sm font-medium leading-6 text-muted">
                {answeredCount} of {questions.length} answered. Finish saves accuracy and weak-topic signals.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold text-primary">Accuracy by topic</h3>
              <div className="mt-5 space-y-3">
                {topicAccuracy.length ? (
                  topicAccuracy.slice(0, 4).map((item) => (
                    <div key={item.topic}>
                      <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span className="text-primary">{item.topic}</span>
                        <span className="text-muted">{item.accuracy}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${item.accuracy}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-medium leading-6 text-muted">Complete a quiz to populate topic accuracy.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
