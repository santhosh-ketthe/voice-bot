import React, { useState } from 'react';
import { Send, Square, X, Volume2 } from 'lucide-react';
import { BotState } from '../types';
import { MicButton } from './MicButton';
import { AudioVisualizer } from './AudioVisualizer';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  state: BotState;
  duration: number;
  audioLevel?: number;
  lastRecordedAudioUrl?: string | null;
  onToggleMic: () => void;
  onStop: () => void;
  isServerHealthy?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message or tap mic...',
  state,
  duration,
  audioLevel = 0,
  lastRecordedAudioUrl,
  onToggleMic,
  onStop,
  isServerHealthy = true,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-900/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 md:px-12 py-3">
        {/* If actively recording audio, show the recording toolbar */}
        {state === 'listening' ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-lg shadow-rose-500/10 animate-in fade-in">
          {/* Live recording indicator */}
          <div className="flex items-center gap-2.5 text-rose-400 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="tracking-wide">
              Recording {formatDuration(duration)}
            </span>
            <span className="text-slate-500 font-normal">/ 0:30</span>
          </div>

          {/* Mini Waveform Visualizer */}
          <div className="flex-1 max-w-[120px] flex justify-center">
            <AudioVisualizer active={true} color="rose" bars={5} level={audioLevel} />
          </div>

          {/* Controls: Cancel & Finish */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onStop}
              title="Cancel recording"
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMic}
              title="Finish & Transcribe"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/30 transition-all active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Last Recorded Voice Audio Player Preview */}
          {lastRecordedAudioUrl && (
            <div className="mb-2.5 flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/95 border border-indigo-500/30 text-xs shadow-md animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-slate-200 font-semibold text-[11px] whitespace-nowrap">
                  Your Captured Voice:
                </span>
                <audio
                  controls
                  src={lastRecordedAudioUrl}
                  className="h-7 w-48 sm:w-72 accent-indigo-500 rounded"
                />
              </div>
              <span className="text-slate-400 text-[10px] hidden sm:inline">
                Tap play to verify microphone input
              </span>
            </div>
          )}

          {/* Standard Chat Input Bar: Text Input + Stop (if speaking) + Mic + Send */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Text Input Field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || state === 'transcribing' || state === 'thinking'}
              placeholder={placeholder}
              className="w-full pl-4 pr-3 py-2.5 rounded-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* Stop Audio Button (Visible during voice playback) */}
          {state === 'speaking' && (
            <button
              type="button"
              onClick={onStop}
              title="Stop audio playback"
              className="p-2.5 rounded-full bg-slate-900 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all shadow-sm active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}

          {/* Voice Mic Button (Beside Send) */}
          <MicButton
            state={state}
            duration={duration}
            onToggle={onToggleMic}
            disabled={!isServerHealthy || disabled}
            compact={true}
          />

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={disabled || !text.trim() || state === 'transcribing' || state === 'thinking'}
            aria-label="Send message"
            className="flex-shrink-0 w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all active:scale-95 shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      )}
      </div>
    </div>
  );
};
