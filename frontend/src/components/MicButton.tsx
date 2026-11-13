import React from 'react';
import { Mic, Square, Loader2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { BotState } from '../types';

interface MicButtonProps {
  state: BotState;
  duration: number;
  onToggle: () => void;
  disabled?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  duration,
  onToggle,
  disabled = false,
}) => {
  // Format recording duration mm:ss
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const renderIconAndLabel = () => {
    switch (state) {
      case 'listening':
        return {
          icon: <Square className="w-9 h-9 text-white fill-white animate-pulse" />,
          label: `Listening (${formatDuration(duration)} / 0:30)`,
          hint: 'Tap to send',
          ringColor: 'border-rose-500 bg-rose-600/90 shadow-lg shadow-rose-500/50',
          pulsingClass: 'animate-voice-listening',
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="w-9 h-9 text-violet-200 animate-spin" />,
          label: 'Transcribing speech...',
          hint: 'Whisper AI processing',
          ringColor: 'border-violet-500 bg-violet-600/80 shadow-lg shadow-violet-500/40',
          pulsingClass: 'animate-pulse',
        };
      case 'thinking':
        return {
          icon: <Sparkles className="w-9 h-9 text-amber-200 animate-spin" />,
          label: 'Formulating answer...',
          hint: 'Llama 3.3 70B reasoning',
          ringColor: 'border-amber-500 bg-amber-600/80 shadow-lg shadow-amber-500/40',
          pulsingClass: 'animate-pulse',
        };
      case 'speaking':
        return {
          icon: <Volume2 className="w-9 h-9 text-indigo-100 animate-bounce" />,
          label: 'Speaking...',
          hint: 'Tap to stop',
          ringColor: 'border-indigo-400 bg-indigo-600 shadow-lg shadow-indigo-500/50',
          pulsingClass: 'animate-voice-speaking',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-9 h-9 text-rose-200" />,
          label: 'Failed to complete',
          hint: 'Tap to retry',
          ringColor: 'border-rose-600 bg-rose-700/80 shadow-lg shadow-rose-700/30',
          pulsingClass: '',
        };
      case 'idle':
      default:
        return {
          icon: <Mic className="w-9 h-9 text-white" />,
          label: 'Tap to speak',
          hint: 'Ask anything about my background',
          ringColor: 'border-indigo-500/60 bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105',
          pulsingClass: '',
        };
    }
  };

  const { icon, label, hint, ringColor, pulsingClass } = renderIconAndLabel();

  return (
    <div className="flex flex-col items-center justify-center my-4 select-none">
      <div className="relative flex items-center justify-center">
        {/* Ambient background glow ring */}
        <div
          className={`absolute -inset-3 rounded-full opacity-40 blur-xl transition-all duration-500 ${
            state === 'listening'
              ? 'bg-rose-500'
              : state === 'speaking'
              ? 'bg-indigo-500'
              : state === 'thinking'
              ? 'bg-amber-500'
              : 'bg-indigo-500/30'
          }`}
        />

        {/* Main interactive button */}
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || state === 'transcribing' || state === 'thinking'}
          aria-label={label}
          className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/40 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed ${ringColor} ${pulsingClass}`}
        >
          {icon}
        </button>
      </div>

      {/* Primary status label */}
      <span className="mt-3.5 text-base sm:text-lg font-semibold text-slate-100 tracking-wide text-center">
        {label}
      </span>

      {/* Secondary contextual hint */}
      <span className="text-xs text-slate-400 text-center tracking-normal">
        {hint}
      </span>
    </div>
  );
};
