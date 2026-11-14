import React, { useState, useEffect } from 'react';
import { useVoiceBot } from './hooks/useVoiceBot';
import { Transcript } from './components/Transcript';
import { StarterChips } from './components/StarterChips';
import { StatusBar } from './components/StatusBar';
import { TextInput } from './components/TextInput';
import { AudioVisualizer } from './components/AudioVisualizer';
import { checkHealth } from './api';
import { Sparkles, Shield, Square, Mic, Settings2 } from 'lucide-react';

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
    audioLevel,
    isPermissionDenied,
    activeMicLabel,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    lastRecordedAudioUrl,
    handleToggleMic,
    handleSelectStarterChip,
    handleSendTextMessage,
    handleStop,
    clearError,
  } = useVoiceBot();

  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showMicModal, setShowMicModal] = useState<boolean>(false);

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
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header Bar */}
      <header className="w-full px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-20">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMicModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
            title="Microphone Settings & Diagnostics"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline text-[11px] max-w-[130px] truncate">
              {activeMicLabel || 'Mic Settings'}
            </span>
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Architecture & Persona details"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
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

      {/* Active Speech Bar (Only appears when assistant is speaking) */}
      {isSpeaking && (
        <div className="px-4 py-2 flex items-center justify-between bg-indigo-950/70 border-t border-indigo-500/20 text-indigo-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AudioVisualizer active={true} color="indigo" bars={5} />
            <span className="font-medium tracking-wide">Santhosh is speaking...</span>
          </div>
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-indigo-500/30 hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-[11px]"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop Audio</span>
          </button>
        </div>
      )}

      {/* Suggested Starter Chips */}
      <StarterChips
        samples={samples}
        onSelect={handleSelectStarterChip}
        disabled={isRecording || isProcessing || isSpeaking}
      />

      {/* Integrated Chat Bar: Text Input with Mic beside Send Button */}
      <TextInput
        onSend={handleSendTextMessage}
        disabled={isRecording || isProcessing}
        placeholder={
          isPermissionDenied
            ? 'Mic blocked: Type your question here...'
            : 'Ask Santhosh anything or tap mic...'
        }
        state={state}
        duration={recordingDuration}
        audioLevel={audioLevel}
        lastRecordedAudioUrl={lastRecordedAudioUrl}
        onToggleMic={handleToggleMic}
        onStop={handleStop}
        isServerHealthy={isServerHealthy}
      />

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
                <strong className="text-white">Real-Time Voice Pipeline:</strong> Uses browser MediaRecorder to capture audio, streamed to Groq Whisper Turbo for sub-second STT, evaluated against Groq GPT-OSS 20B (with Gemini Flash fallback), and synthesized via Edge-TTS.
              </p>
              <p>
                <strong className="text-white">Grounding & Persona:</strong> Grounded strictly in Santhosh's verified engineering career (B.Tech, 3 years at Covalense Global, specialized in GenAI & low-latency voice bots).
              </p>
              <p>
                <strong className="text-white">Microphone Health & Safety:</strong> Real-time acoustic volume analysis, Whisper hallucination filters, and audio duration validation.
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

      {/* Microphone Settings & Diagnostics Modal */}
      {showMicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-slate-100 text-base">
                  Microphone Settings & Test
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMicModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  Select Audio Input Device:
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Default System Microphone</option>
                  {availableDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Active: {activeMicLabel}
                </p>
              </div>

              {/* Live VU / Volume Meter */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">
                  Live Volume Level:
                </label>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden flex items-center px-0.5">
                  <div
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-100"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {state === 'listening'
                    ? 'Speak now — the meter moves to your voice volume.'
                    : 'Tap the mic in the bottom bar to test input.'}
                </p>
              </div>

              {lastRecordedAudioUrl && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                  <span className="block font-semibold text-slate-200 mb-1">
                    Your Last Captured Recording:
                  </span>
                  <audio controls src={lastRecordedAudioUrl} className="w-full h-8" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMicModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-white text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
