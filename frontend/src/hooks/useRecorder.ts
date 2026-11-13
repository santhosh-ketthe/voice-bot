import { useState, useRef, useCallback } from 'react';

export interface UseRecorderResult {
  isRecording: boolean;
  isPermissionDenied: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  cancelRecording: () => void;
  recorderError: string | null;
}

export function useRecorder(): UseRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  const getSupportedMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const cleanupStream = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setRecorderError(null);
    setIsPermissionDenied(false);
    chunksRef.current = [];
    setRecordingDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(100); // 100ms time slice for responsive data gathering
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Duration counter + 30-second auto-stop limit
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(Math.floor(elapsed));
        if (elapsed >= 30) {
          stopRecording();
        }
      }, 250);
    } catch (err: any) {
      cleanupStream();
      setIsRecording(false);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('Permission')
      ) {
        setIsPermissionDenied(true);
        setRecorderError('Microphone access was denied. Please allow mic permissions in your browser or type below.');
      } else {
        setRecorderError(err.message || 'Could not access microphone.');
      }
    }
  }, [cleanupStream]);

  const stopRecording = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupStream();
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        cleanupStream();
        setIsRecording(false);

        // Discard recordings under ~0.35s to prevent accidental taps
        if (duration < 0.35) {
          setRecorderError("Didn't catch that, please tap and speak a full sentence.");
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });
        resolve({ blob: finalBlob, mimeType });
      };

      if (recorder.state === 'recording') {
        try {
          recorder.requestData();
        } catch {
          // ignore
        }
        recorder.stop();
      }
    });
  }, [cleanupStream]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupStream();
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  }, [cleanupStream]);

  return {
    isRecording,
    isPermissionDenied,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    recorderError,
  };
}

