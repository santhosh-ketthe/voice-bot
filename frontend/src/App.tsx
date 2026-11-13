import React, { useState, useEffect } from 'react';
import { useVoiceBot } from './hooks/useVoiceBot';
import { MicButton } from './components/MicButton';
import { Transcript } from './components/Transcript';
import { StarterChips } from './components/StarterChips';
import { StatusBar } from './components/StatusBar';
import { TextInput } from './components/TextInput';
import { AudioVisualizer } from './components/AudioVisualizer';
import { checkHealth } from './api';
import { Sparkles, Shield, Square } from 'lucide-react';

export const App: React.FC = () => {
  const {
    state,
    messages,
    errorMessage,
    samples,
    isRecording,
    isSpeaking,
    isProcessing,
    recordingDuration,
    isPermissionDenied,
    handleToggleMic,
    handleSelectStarterChip,
    handleSendTextMessage,
    handleStop,
    clearError,
  } = useVoiceBot();

  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Periodic health check ping (keeps Render alive & validates API)
  useEffect(() => {
    let mounted = true;
    const runHealthCheck = async () => {
      try {
        const health = await checkHealth();
        if (mounted) setIsServerHealthy(health.ok);
      } catch {
        if (mounted) setIsServerHealthy(false);
      }
    };

    runHealthCheck();
    const interval = setInterval(runHealthCheck, 30000); // Check every 30s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto bg-slate-950 text-slate-100 border-x border-slate-900/80 shadow-2xl overflow-hidden">
      {/* Header Bar */}
      <header className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-base text-white shadow-md shadow-indigo-500/20">
              S
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                isServerHealthy ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={isServerHealthy ? 'API Online' : 'Connecting to API'}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-sm sm:text-base text-slate-100">
                Santhosh
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Voice AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Senior AI & Full-Stack Engineer
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Architecture & Persona details"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
        </button>
      </header>

      {/* Global Status Bar / Toasts */}
      <StatusBar
        state={state}
        errorMessage={errorMessage}
        onClearError={clearError}
        isOnline={isServerHealthy}
      />

      {/* Main Conversation Transcript */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <Transcript messages={messages} isProcessing={isProcessing} />
      </main>

      {/* Suggested Starter Chips */}
      <StarterChips
        samples={samples}
        onSelect={handleSelectStarterChip}
        disabled={isRecording || isProcessing || isSpeaking}
      />

      {/* Interactive Voice Controls Section */}
      <footer className="pt-2 pb-4 bg-slate-950/95 border-t border-slate-900/80 backdrop-blur-md flex flex-col items-center">
        {/* Audio Visualizer Wave */}
        <div className="h-6 mb-1">
          <AudioVisualizer
            active={isRecording || isSpeaking}
            color={isRecording ? 'rose' : isSpeaking ? 'indigo' : 'indigo'}
            bars={7}
          />
        </div>

        {/* Primary Mic & Interrupt Control */}
        <div className="relative flex items-center justify-center">
          <MicButton
            state={state}
            duration={recordingDuration}
            onToggle={handleToggleMic}
            disabled={!isServerHealthy}
          />

          {(isSpeaking || isRecording) && (
            <button
              type="button"
              onClick={handleStop}
              title="Interrupt playback or recording"
              className="absolute right-[-48px] top-8 p-2.5 rounded-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>

        {/* Fallback Text Input */}
        <TextInput
          onSend={handleSendTextMessage}
          disabled={isRecording || isProcessing || isSpeaking}
          placeholder={
            isPermissionDenied
              ? 'Mic blocked: Type your question here...'
              : 'Tap mic or type a question...'
          }
        />

        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 tracking-tight">
          <span>Groq Whisper</span>
          <span>•</span>
          <span>Llama 3.3 70B</span>
          <span>•</span>
          <span>Edge-TTS</span>
        </div>
      </footer>

      {/* Info / Architecture Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 text-base">
                  Voice Bot Architecture
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong className="text-white">Real-Time Voice Pipeline:</strong> Uses browser MediaRecorder to capture audio, streamed to Groq Whisper Turbo for sub-second STT, evaluated against Groq Llama 3.3 70B (with Gemini Flash fallback), and synthesized via Edge-TTS.
              </p>
              <p>
                <strong className="text-white">Grounding & Persona:</strong> Grounded strictly in Santhosh's verified engineering career (B.Tech, 3 years at Covalense Global, specialized in GenAI & low-latency voice bots).
              </p>
              <p>
                <strong className="text-white">Production Hardening:</strong> Built-in rate limiting (20 req/min), daily budget quota, audio duration validation, and pre-warmed response caches.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-white text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
