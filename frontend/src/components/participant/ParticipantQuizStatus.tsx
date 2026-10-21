import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Quiz } from '../../services/quizService';
import { isRunningQuiz, preferredParticipantQuiz } from '../../services/quizLaunch';

export const ParticipantQuizStatus: React.FC<{ quizzes: Quiz[] | null }> = ({ quizzes }) => {
  const quiz = quizzes ? preferredParticipantQuiz(quizzes) : undefined;
  const running = quiz && isRunningQuiz(quiz);
  const ready = quiz?.status === 'READY';
  const countdown = quiz?.preQuizCountdownSeconds ?? 10;
  const heading = !quizzes ? 'Checking for quizzes…' : !quiz ? 'No quiz published yet' : ready ? 'Upcoming quiz' : running ? quiz.status === 'PAUSED' ? 'Test paused' : 'Test is live' : 'Latest quiz results';
  const message = !quizzes ? 'Connecting to the competition.' : !quiz ? 'Your quiz will appear here as soon as the super admin publishes it.' : ready ? `Published and ready. ${countdown > 0 ? `The ${countdown}-second countdown` : 'The test'} will open automatically when the super admin clicks Start test.` : running ? 'Open the test to view your team’s questions and saved answers.' : 'This round has ended. The super admin can reset and publish it again for a fresh attempt.';
  return <section aria-label="Participant quiz status" className="rounded-2xl border border-orange-300 bg-[#FEF3E2] p-5 flex flex-wrap items-center gap-4">
    <div className="rounded-xl bg-[#D4621A] text-white p-3"><ClipboardList size={26} /></div>
    <div className="flex-1 min-w-[200px]"><p className="text-xs font-semibold uppercase tracking-wider text-orange-800">{heading}</p><h2 className="text-xl font-bold mt-1">{quiz?.name || 'Quizzes & Assessment'}</h2><p className="text-sm text-stone-600 mt-2">{message}</p>{quiz && <p className="text-xs text-orange-900 mt-2">{quiz.questionCount ?? '—'} questions · {quiz.durationSeconds / 60} minutes</p>}</div>
    {quiz && <Link className="rounded-xl bg-[#D4621A] text-white px-5 py-3 text-sm font-semibold" to={'/team-dashboard?tab=quizzes&quiz=' + encodeURIComponent(quiz.id)}>{ready ? 'Open quiz waiting room' : running ? 'Open test' : 'View results'}</Link>}
  </section>;
};
