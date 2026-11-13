import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAudioPlayerResult {
  isPlaying: boolean;
  playAudioBlob: (blob: Blob, fallbackText?: string) => Promise<void>;
  playWithSpeechSynthesis: (text: string) => Promise<void>;
  stopAudio: () => void;
  unlockAudio: () => void;
  playerError: string | null;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeUrlRef = useRef<string | null>(null);
  const isUnlockedRef = useRef<boolean>(false);

  // Unlock audio policy on mobile browsers (especially iOS Safari)
  const unlockAudio = useCallback(() => {
    if (isUnlockedRef.current) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      // Play and immediately pause a silent fragment to register user interaction
      const audio = audioRef.current;
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.load();
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        isUnlockedRef.current = true;
      }).catch(() => {
        // Ignored, user gesture will unlock on subsequent tap
      });
    } catch {
      // AudioContext / Audio not yet permissible
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playWithSpeechSynthesis = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setPlayerError('Speech synthesis not supported in this browser.');
        setIsPlaying(false);
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setPlayerError(null);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsPlaying(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const playAudioBlob = useCallback(
    async (blob: Blob, fallbackText?: string): Promise<void> => {
      stopAudio();
      setPlayerError(null);

      if (!blob || blob.size === 0) {
        if (fallbackText) {
          return playWithSpeechSynthesis(fallbackText);
        }
        return;
      }

      try {
        const objectUrl = URL.createObjectURL(blob);
        activeUrlRef.current = objectUrl;

        if (!audioRef.current) {
          audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        audio.src = objectUrl;

        return new Promise((resolve) => {
          audio.onended = () => {
            stopAudio();
            resolve();
          };

          audio.onerror = async (err) => {
            console.warn('Audio playback error, falling back to browser speech:', err);
            stopAudio();
            if (fallbackText) {
              await playWithSpeechSynthesis(fallbackText);
            } else {
              setPlayerError('Audio playback failed.');
            }
            resolve();
          };

          setIsPlaying(true);
          audio.play().catch(async (playErr) => {
            console.warn('Audio play() rejected:', playErr);
            if (fallbackText) {
              await playWithSpeechSynthesis(fallbackText);
            } else {
              setPlayerError('Autoplay blocked. Tap to listen.');
            }
            setIsPlaying(false);
            resolve();
          });
        });
      } catch (err: any) {
        console.error('Error in playAudioBlob:', err);
        if (fallbackText) {
          return playWithSpeechSynthesis(fallbackText);
        }
        setPlayerError(err.message || 'Failed to play audio.');
      }
    },
    [stopAudio, playWithSpeechSynthesis]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    isPlaying,
    playAudioBlob,
    playWithSpeechSynthesis,
    stopAudio,
    unlockAudio,
    playerError,
  };
}
