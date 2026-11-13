import { useState, useCallback, useRef, useEffect } from 'react';
import { BotState, ChatMessage, SampleQuestion, APIErrorDetail } from '../types';
import { useRecorder } from './useRecorder';
import { useAudioPlayer } from './useAudioPlayer';
import { transcribeAudio, sendChatMessage, fetchTTSAudio, fetchSamples } from '../api';

export function useVoiceBot() {
  const [state, setState] = useState<BotState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  const recorder = useRecorder();
  const player = useAudioPlayer();

  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  // Load sample starter questions on mount
  useEffect(() => {
    let mounted = true;
    setIsLoadingSamples(true);
    fetchSamples()
      .then((data) => {
        if (mounted && data.length > 0) {
          setSamples(data);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingSamples(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Update error message when recorder reports an issue
  useEffect(() => {
    if (recorder.recorderError) {
      setErrorMessage(recorder.recorderError);
      setState('error');
    }
  }, [recorder.recorderError]);

  // Synchronize player state with bot state
  useEffect(() => {
    if (!player.isPlaying && state === 'speaking') {
      setState('idle');
    }
  }, [player.isPlaying, state]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (state === 'error') {
      setState('idle');
    }
  }, [state]);

  /** Helper to append a message to the transcript */
  const appendMessage = useCallback((role: 'user' | 'assistant', content: string, source?: string) => {
    const newMessage: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      source,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  /** Main pipeline to process a text question (from STT, chip, or text input) */
  const processUserQuestion = useCallback(
    async (questionText: string, sampleId?: string) => {
      const cleanQuestion = questionText.trim();
      if (!cleanQuestion) return;

      player.stopAudio();
      setErrorMessage(null);

      // 1. Add user message
      appendMessage('user', cleanQuestion);
      setState('thinking');

      try {
        // 2. Build history payload
        const historyPayload = messagesRef.current.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        historyPayload.push({ role: 'user', content: cleanQuestion });

        // 3. Send to LLM backend
        const chatRes = await sendChatMessage(historyPayload);
        const assistantText = chatRes.answer;
        const matchedSampleId = sampleId || chatRes.sample_id;

        // 4. Add assistant response
        appendMessage('assistant', assistantText, chatRes.source);

        // 5. Synthesize speech and play
        setState('speaking');
        try {
          const audioBlob = await fetchTTSAudio(assistantText, matchedSampleId);
          await player.playAudioBlob(audioBlob, assistantText);
        } catch (ttsErr) {
          console.warn('Backend TTS failed, using browser speech synthesis fallback:', ttsErr);
          await player.playWithSpeechSynthesis(assistantText);
        }

        setState('idle');
      } catch (err: any) {
        console.error('Error processing question:', err);
        const userMsg =
          (err as APIErrorDetail)?.userMessage ||
          err?.message ||
          'Something went wrong while processing your request.';
        setErrorMessage(userMsg);
        setState('error');
      }
    },
    [appendMessage, player]
  );

  /** User clicks the main microphone button */
  const handleToggleMic = useCallback(async () => {
    player.unlockAudio(); // Unlock audio context on user gesture
    clearError();

    // If currently speaking, stop playback and become idle
    if (state === 'speaking') {
      player.stopAudio();
      setState('idle');
      return;
    }

    // If currently listening, stop and transcribe
    if (state === 'listening') {
      setState('transcribing');
      const recordingResult = await recorder.stopRecording();
      if (!recordingResult) {
        setState('idle');
        return;
      }

      try {
        const { blob, mimeType } = recordingResult;
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const transcribedText = await transcribeAudio(blob, `voice.${extension}`);

        if (!transcribedText.trim()) {
          setErrorMessage("Didn't catch any words. Please try again.");
          setState('error');
          return;
        }

        await processUserQuestion(transcribedText);
      } catch (err: any) {
        console.error('Transcription error:', err);
        const userMsg =
          (err as APIErrorDetail)?.userMessage ||
          'Could not transcribe your audio. Please try again or type below.';
        setErrorMessage(userMsg);
        setState('error');
      }
      return;
    }

    // If currently idle or in error, start listening
    if (state === 'idle' || state === 'error') {
      try {
        await recorder.startRecording();
        setState('listening');
      } catch (err: any) {
        setErrorMessage(err.message || 'Microphone activation failed.');
        setState('error');
      }
    }
  }, [state, player, clearError, recorder, processUserQuestion]);

  /** User clicks one of the pre-warmed starter chips */
  const handleSelectStarterChip = useCallback(
    (chip: SampleQuestion) => {
      player.unlockAudio();
      clearError();
      processUserQuestion(chip.question, chip.id);
    },
    [player, clearError, processUserQuestion]
  );

  /** User submits via fallback text input */
  const handleSendTextMessage = useCallback(
    (text: string) => {
      player.unlockAudio();
      clearError();
      processUserQuestion(text);
    },
    [player, clearError, processUserQuestion]
  );

  /** Stop/Interrupt current activity */
  const handleStop = useCallback(() => {
    if (state === 'listening') {
      recorder.cancelRecording();
    }
    if (state === 'speaking') {
      player.stopAudio();
    }
    setState('idle');
  }, [state, recorder, player]);

  return {
    state,
    messages,
    errorMessage,
    samples,
    isLoadingSamples,
    isRecording: state === 'listening',
    isSpeaking: state === 'speaking',
    isProcessing: state === 'transcribing' || state === 'thinking',
    recordingDuration: recorder.recordingDuration,
    isPermissionDenied: recorder.isPermissionDenied,
    handleToggleMic,
    handleSelectStarterChip,
    handleSendTextMessage,
    handleStop,
    clearError,
  };
}
