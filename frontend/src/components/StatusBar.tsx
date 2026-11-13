import React from 'react';
import { BotState } from '../types';
import { AlertCircle, X, WifiOff } from 'lucide-react';

interface StatusBarProps {
  state?: BotState;
  errorMessage: string | null;
  onClearError: () => void;
  isOnline?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  errorMessage,
  onClearError,
  isOnline = true,
}) => {
  return (
    <div className="w-full">
      {/* Top Banner / Error notification */}
      {errorMessage && (
        <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start justify-between gap-2 text-rose-300 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="p-1 hover:bg-rose-500/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5 text-rose-300" />
          </button>
        </div>
      )}

      {/* Online indicator badge */}
      {!isOnline && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Server disconnected. Reconnecting...</span>
        </div>
      )}
    </div>
  );
};
