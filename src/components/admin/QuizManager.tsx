import React from 'react';
import { QuizDetails, QuizRoundId } from '../../types/quiz';
import { Button } from '../common/Button';
import { HelpCircle, Play, Pause, Clock } from 'lucide-react';

interface QuizManagerProps {
  quizzes: QuizDetails[];
  onToggleStatus: (quizId: QuizRoundId, currentActive: boolean) => Promise<void>;
  isLoading?: boolean;
}

export const QuizManager: React.FC<QuizManagerProps> = ({
  quizzes,
  onToggleStatus,
  isLoading = false,
}) => {
  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => (
        <div
          key={quiz.id}
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl ${
              quiz.isActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">{quiz.title}</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  quiz.isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {quiz.isActive ? 'Live' : 'Locked'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{quiz.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {quiz.durationMinutes} Mins
                </span>
                <span>•</span>
                <span>{quiz.totalQuestions} Questions</span>
                <span>•</span>
                <span className="text-cyan-300 font-semibold">{quiz.totalPoints} Points</span>
              </div>
            </div>
          </div>

          <div>
            <Button
              size="sm"
              variant={quiz.isActive ? 'secondary' : 'primary'}
              onClick={() => onToggleStatus(quiz.id, quiz.isActive)}
              isLoading={isLoading}
            >
              {quiz.isActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  Lock Quiz
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  Activate Quiz
                </>
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
