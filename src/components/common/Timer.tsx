import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialMinutes: number;
  onTimeUp?: () => void;
  isRunning?: boolean;
}

export const Timer: React.FC<TimerProps> = ({
  initialMinutes,
  onTimeUp,
  isRunning = true,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      if (secondsLeft <= 0 && onTimeUp) onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 180; // under 3 minutes

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-semibold text-sm transition-colors ${
        isUrgent
          ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
          : 'bg-slate-800 text-cyan-400 border-slate-700'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-cyan-400'}`} />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};
