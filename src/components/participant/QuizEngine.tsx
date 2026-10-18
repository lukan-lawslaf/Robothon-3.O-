import React, { useState } from 'react';
import { QuizDetails } from '../../types/quiz';
import { Timer } from '../common/Timer';
import { Button } from '../common/Button';
import { CheckCircle2, ChevronRight, ChevronLeft, Send, AlertTriangle } from 'lucide-react';

interface QuizEngineProps {
  quiz: QuizDetails;
  onSubmit: (answers: Record<string, string>, timeTakenSeconds: number) => Promise<void>;
  isSubmitting?: boolean;
}

export const QuizEngine: React.FC<QuizEngineProps> = ({
  quiz,
  onSubmit,
  isSubmitting = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isComplete = answeredCount === quiz.questions.length;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleFinalSubmit = () => {
    onSubmit(selectedAnswers, 600); // placeholder time
  };

  return (
    <div className="max-w-3xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header with Title and Timer */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 flex-wrap gap-4">
        <div>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
            {quiz.title}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
            Question {currentIndex + 1} of {quiz.questions.length}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Timer initialMinutes={quiz.durationMinutes} onTimeUp={handleFinalSubmit} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full my-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <div className="my-6">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              {currentQuestion.category || 'Technical'}
            </span>
            <span className="text-xs font-mono text-slate-400 font-semibold">
              +{currentQuestion.points} Points
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-medium text-slate-100 leading-snug">
            {currentQuestion.text}
          </h3>

          {/* Options */}
          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                  className={`w-full text-left p-4 rounded-xl border text-sm sm:text-base font-normal transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-600/20 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <span className="flex-1 pr-4">{opt.text}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-8">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span>{answeredCount}</span>
          <span>/</span>
          <span>{quiz.questions.length} answered</span>
        </div>

        {currentIndex < quiz.questions.length - 1 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCurrentIndex((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowConfirmModal(true)}
            isLoading={isSubmitting}
          >
            <Send className="w-4 h-4" />
            Submit Quiz
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-lg font-bold text-white">Confirm Quiz Submission</h4>
            </div>
            <p className="text-sm text-slate-300">
              You have answered <span className="font-bold text-cyan-400">{answeredCount}</span> out of{' '}
              <span className="font-bold text-white">{quiz.questions.length}</span> questions.
              {!isComplete && (
                <span className="block mt-1 text-amber-400/90 font-medium">
                  Warning: Some questions are still unanswered.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)}>
                Review Questions
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
              >
                Yes, Submit Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
