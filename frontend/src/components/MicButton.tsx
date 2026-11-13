import React from 'react';
import { Mic, Square, Loader2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { BotState } from '../types';

interface MicButtonProps {
  state: BotState;
  duration: number;
  onToggle: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  duration,
  onToggle,
  disabled = false,
  compact = true,
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
          icon: <Square className="w-4 h-4 text-white fill-white animate-pulse" />,
          label: `Recording (${formatDuration(duration)})`,
          hint: 'Tap to send voice',
          ringColor: 'border-rose-500 bg-rose-600 text-white shadow-md shadow-rose-500/50',
          pulsingClass: 'animate-voice-listening',
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="w-4 h-4 text-violet-200 animate-spin" />,
          label: 'Transcribing speech...',
          hint: 'Whisper AI processing',
          ringColor: 'border-violet-500 bg-violet-600/90 text-white shadow-md shadow-violet-500/40',
          pulsingClass: 'animate-pulse',
        };
      case 'thinking':
        return {
          icon: <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />,
          label: 'Formulating answer...',
          hint: 'Llama 3.3 70B reasoning',
          ringColor: 'border-amber-500 bg-amber-600/90 text-white shadow-md shadow-amber-500/40',
          pulsingClass: 'animate-pulse',
        };
      case 'speaking':
        return {
          icon: <Volume2 className="w-4 h-4 text-indigo-100 animate-bounce" />,
          label: 'Speaking response',
          hint: 'Tap to stop audio',
          ringColor: 'border-indigo-400 bg-indigo-600 text-white shadow-md shadow-indigo-500/50',
          pulsingClass: 'animate-voice-speaking',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-200" />,
          label: 'Error occurred',
          hint: 'Tap to retry',
          ringColor: 'border-rose-600 bg-rose-700 text-white shadow-md shadow-rose-700/30',
          pulsingClass: '',
        };
      case 'idle':
      default:
        return {
          icon: <Mic className="w-5 h-5 text-indigo-300 group-hover:text-white transition-colors" />,
          label: 'Voice Input',
          hint: 'Tap to speak question',
          ringColor: 'border-slate-700/80 bg-slate-900/90 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white shadow-sm',
          pulsingClass: '',
        };
    }
  };

  const { icon, label, hint, ringColor, pulsingClass } = renderIconAndLabel();

  if (compact) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || state === 'transcribing' || state === 'thinking'}
        aria-label={label}
        title={`${label} - ${hint}`}
        className={`group relative flex-shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${ringColor} ${pulsingClass}`}
      >
        {icon}
      </button>
    );
  }

  // Fallback large variant if needed
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || state === 'transcribing' || state === 'thinking'}
        aria-label={label}
        className={`relative z-10 w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed ${ringColor} ${pulsingClass}`}
      >
        {icon}
      </button>
      <span className="mt-2 text-sm font-semibold text-slate-100">{label}</span>
      <span className="text-[11px] text-slate-400">{hint}</span>
    </div>
  );
};
