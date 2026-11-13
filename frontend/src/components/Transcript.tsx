import React, { useEffect, useRef } from 'react';
import { Bot, User, Sparkles, Zap, Database } from 'lucide-react';
import { ChatMessage } from '../types';

interface TranscriptProps {
  messages: ChatMessage[];
  isProcessing?: boolean;
}

export const Transcript: React.FC<TranscriptProps> = ({ messages, isProcessing = false }) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const renderSourceBadge = (source?: string) => {
    if (!source) return null;

    if (source.includes('cache')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Database className="w-2.5 h-2.5" />
          Pre-warmed Instant
        </span>
      );
    }
    if (source.includes('groq')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
          <Zap className="w-2.5 h-2.5" />
          Groq GPT-OSS 20B
        </span>
      );
    }
    if (source.includes('gemini')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
          <Sparkles className="w-2.5 h-2.5" />
          Gemini Flash Fallback
        </span>
      );
    }
    return null;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
          <Bot className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-200 mb-1">
          Ask Santhosh Anything
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
          Tap the microphone or choose a starter chip below to ask about technical background, GenAI architectures, and superpowers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-5 space-y-4 w-full max-w-6xl mx-auto">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                isUser
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-indigo-300'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-sm shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Message metadata / footer */}
              {!isUser && msg.source && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {renderSourceBadge(msg.source)}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Thinking / Typing placeholder indicator */}
      {isProcessing && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-indigo-300">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-150" />
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-300" />
          </div>
        </div>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};

