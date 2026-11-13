import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your question...',
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

  return (
    <form onSubmit={handleSubmit} className="w-full px-4 py-2">
      <div className="relative flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-4 pr-12 py-3 rounded-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="absolute right-1.5 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all active:scale-95 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
