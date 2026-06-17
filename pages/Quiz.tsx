import React, { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Circle, Loader2, RotateCcw, Sparkles, Target, Trophy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, SegmentedControl } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { generateQuizFromSources } from "../src/lib/api";
import type { QuizDifficulty, QuizQuestion } from "../types";

const difficulties: Array<QuizDifficulty | "all"> = ["all", "easy", "medium", "hard"];

const Quiz: React.FC = () => {
  const data = useLearningData();
  const [searchParams] = useSearchParams();
  const readySources = useMemo(
    () => data.sources.filter((source) => source.status === "ready" && (source.chunkCount ?? 0) > 0),
    [data.sources],
  );
  const topics = useMemo(() => ["All", ...Array.from(new Set(data.quizQuestions.map((question) => question.topic)))], [data.quizQuestions]);
  const initialSourceId = searchParams.get("sourceId");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(() =>
    initialSourceId && readySources.some((source) => source.id === initialSourceId) ? [initialSourceId] : readySources[0]?.id ? [readySources[0].id] : [],
  );
  const [topic, setTopic] = useState("All");
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "all">("all");
  const [generationDifficulty, setGenerationDifficulty] = useState<QuizDifficulty | "mixed">("mixed");
  const [generatedQuizId, setGeneratedQuizId] = useState("source-quiz");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [retryQuestionIds, setRetryQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedSourceIds.length || !readySources.length) return;
    if (initialSourceId && readySources.some((source) => source.id === initialSourceId)) {
      setSelectedSourceIds([initialSourceId]);
      return;
    }
    setSelectedSourceIds([readySources[0].id]);
  }, [initialSourceId, readySources, selectedSourceIds.length]);

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

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((prev) => (prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]));
  };

  const handleGenerateQuiz = async () => {
    if (!selectedSourceIds.length) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generated = await generateQuizFromSources(selectedSourceIds, 8, generationDifficulty);
      if (!generated.questions.length) {
        throw new Error("No quiz questions were generated from this source.");
      }
      data.setGeneratedQuizQuestions(generated.questions);
      setGeneratedQuizId(generated.quizId);
      resetQuiz();
      setTopic("All");
      setDifficulty("all");
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const chooseAnswer = (answerIndex: number) => {
    if (!currentQuestion || submitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerIndex }));
  };

  const finishQuiz = () => {
    data.saveQuizAttempt(generatedQuizId, answers, questions);
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
        action={<Button icon={isGenerating ? Loader2 : Sparkles} disabled={!selectedSourceIds.length || isGenerating} onClick={handleGenerateQuiz}>Generate quiz</Button>}
      />

      <Card className="p-4">
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-3 text-sm font-medium text-muted">Source context</p>
            <div className="flex flex-wrap gap-2">
              {readySources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  aria-pressed={selectedSourceIds.includes(source.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70 ${selectedSourceIds.includes(source.id) ? "border-fuchsia-200 bg-gradient-to-r from-pink-50 to-violet-50 text-primary" : "border-default bg-white/80 text-muted hover:-translate-y-0.5 hover:border-fuchsia-200 hover:text-primary"}`}
                >
                  {source.name}
                </button>
              ))}
              {!readySources.length && <span className="text-sm font-medium text-muted">Upload a readable source before generating a quiz.</span>}
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              ariaLabel="Generation difficulty"
              value={generationDifficulty}
              onChange={(next) => setGenerationDifficulty(next as QuizDifficulty | "mixed")}
              options={(["mixed", "easy", "medium", "hard"] as Array<QuizDifficulty | "mixed">).map((item) => ({ value: item, label: item }))}
            />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
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
          </div>
        </div>
      </Card>

      {generationError && <ErrorState title="Quiz generation failed" message={generationError} />}
      {isGenerating && <LoadingState label="Generating quiz from selected source chunks" />}

      {!currentQuestion ? (
        <EmptyState
          title="Generate a quiz from your uploaded sources."
          description="Select one or more ready sources, then LearnBot will create questions from the extracted PDF or URL chunks."
          action={<Button icon={Sparkles} disabled={!selectedSourceIds.length || isGenerating} onClick={handleGenerateQuiz}>Generate Quiz</Button>}
        />
      ) : submitted ? (
        <div className="mx-auto max-w-4xl">
          <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,246,252,0.92))] p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
                  <Trophy className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-3xl font-semibold text-primary">Score: {score} / {questions.length}</h2>
                <p className="mt-2 text-sm text-muted">Accuracy {Math.round((score / questions.length) * 100)}%</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button icon={RotateCcw} onClick={() => resetQuiz()}>New round</Button>
                <Button variant="soft" icon={Target} disabled={!incorrectQuestions.length} onClick={retryIncorrect}>Retry incorrect</Button>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-fuchsia-100 bg-white/65 p-5">
              <h3 className="font-semibold text-primary">Recommended next step</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                {weakTopics.length ? `Review ${weakTopics.join(", ")} next, then retry only the missed questions.` : "No weak topics this round. Move up a difficulty or review flashcards to retain it."}
              </p>
            </div>
            <h3 className="mt-8 text-xl font-semibold text-primary">Review answers</h3>
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
                    className="w-full rounded-xl border border-default bg-white/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-pink-50/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-200/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium text-primary">{question.prompt}</p>
                      <Badge color={correct ? "green" : "red"}>{correct ? "Correct" : "Missed"}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted">Your answer: {answer !== undefined ? question.choices[answer] : "Skipped"}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl">
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm text-muted">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{answeredCount} answered</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-500 to-violet-500 transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
          <Card className="bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,248,253,0.92))] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge color="gray">{currentQuestion.topic}</Badge>
              <Badge color={currentQuestion.difficulty === "hard" ? "red" : currentQuestion.difficulty === "medium" ? "orange" : "green"}>
                {currentQuestion.difficulty}
              </Badge>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm font-medium text-muted">
              <Brain className="h-5 w-5 text-muted" />
              Choose the best answer
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-9 text-primary md:text-3xl">{currentQuestion.prompt}</h2>
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
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 ${
                      reveal && isCorrect
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : reveal && isSelected
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : isSelected
                            ? "border-fuchsia-200 bg-gradient-to-r from-pink-50 to-violet-50 text-primary"
                            : "border-default bg-white/80 text-primary hover:border-fuchsia-200 hover:bg-pink-50/70"
                    }`}
                  >
                    {reveal && isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    {choice}
                  </button>
                );
              })}
            </div>
            {isAnswered && (
              <div className="mt-6 rounded-2xl border border-fuchsia-100 bg-white/65 p-5">
                <h3 className="font-semibold text-primary">{selectedAnswer === currentQuestion.correctChoiceIndex ? "Correct" : "Good try"}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{currentQuestion.explanation}</p>
                {currentQuestion.sourceExcerpt && (
                  <p className="mt-4 rounded-2xl bg-white/60 p-3 text-xs font-semibold leading-5 text-muted">
                    Source: {currentQuestion.sourceExcerpt}
                  </p>
                )}
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

        </div>
      )}
    </div>
  );
};

export default Quiz;
