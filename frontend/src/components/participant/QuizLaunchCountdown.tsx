import React, { useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

export const QuizLaunchCountdown: React.FC<{ name: string; seconds: number }> = ({ name, seconds }) => {
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screen.current?.focus();
    return () => { document.body.style.overflow = overflow; if (before?.isConnected) before.focus(); };
  }, []);
  return <div ref={screen} role="dialog" aria-modal="true" aria-labelledby="quiz-launch-title" tabIndex={-1}
    onKeyDown={event => { if (event.key === 'Tab') event.preventDefault(); }}
    className="fixed inset-0 z-[100] bg-[#FEF3E2] text-[#251306] flex flex-col items-center overflow-y-auto p-4 sm:p-6 outline-none">
    <div className="w-full max-w-xl text-center my-auto shrink-0">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4621A] text-white"><Timer size={28} /></div>
      <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#a8440d]">Super admin started the test</p>
      <h1 id="quiz-launch-title" className="mt-3 text-2xl sm:text-4xl font-bold">{name}</h1>
      <p className="mt-2 text-stone-600">Get ready. Your questions will open automatically.</p>
      <div role="timer" aria-label="Test starts in" className="mx-auto my-4 flex h-[clamp(140px,30dvh,256px)] w-[clamp(140px,30dvh,256px)] items-center justify-center rounded-full border-8 border-orange-200 bg-[#fffaf3] shadow-lg shadow-orange-900/5">
        <span className="font-mono text-[clamp(4rem,15dvh,8rem)] leading-none font-bold tabular-nums text-[#D4621A]">{seconds}</span>
      </div>
      <p className="text-sm font-semibold text-[#a8440d]">{seconds === 0 ? 'Let’s begin!' : 'Starting in ' + seconds + (seconds === 1 ? ' second' : ' seconds')}</p>
      <p className="mt-4 text-xs font-mono text-stone-500">ROBOTHON 3.0 · PARTICIPANT ASSESSMENT</p>
    </div>
  </div>;
};
