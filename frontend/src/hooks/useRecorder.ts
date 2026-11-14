import { useState, useRef, useCallback } from 'react';

export interface UseRecorderResult {
  isRecording: boolean;
  isPermissionDenied: boolean;
  recordingDuration: number;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob; mimeType: string } | null>;
  cancelRecording: () => void;
  recorderError: string | null;
}

export function useRecorder(): UseRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Volume analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeCheckIntervalRef = useRef<number | null>(null);
  const maxVolumeRef = useRef<number>(0);

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
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);

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
    setAudioLevel(0);
    maxVolumeRef.current = 0;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      // Request standard microphone stream with browser-default gain
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            autoGainControl: true,
          },
        });
      }
      streamRef.current = stream;

      const tracks = stream.getAudioTracks();
      if (tracks.length > 0) {
        console.log(`[AudioRecorder] Connected mic: "${tracks[0].label}" (muted: ${tracks[0].muted}, state: ${tracks[0].readyState})`);
      }

      // Setup Web Audio Analyser for real-time speech/volume detection
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          volumeCheckIntervalRef.current = window.setInterval(() => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            if (avg > maxVolumeRef.current) {
              maxVolumeRef.current = avg;
            }
            const normalized = Math.min(100, Math.round((avg / 96) * 100));
            setAudioLevel(normalized);
          }, 100);
        }
      } catch (audioErr) {
        console.warn('AudioContext volume metering unavailable:', audioErr);
      }

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
      };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Deliver regular audio slices every 250ms to ensure full stream capture
      recorder.start(250);
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
        // Small delay to allow final ondataavailable chunk to flush
        setTimeout(() => {
          const duration = (Date.now() - startTimeRef.current) / 1000;
          cleanupStream();
          setIsRecording(false);

          if (!chunksRef.current || chunksRef.current.length === 0) {
            resolve(null);
            return;
          }

          const mimeType = recorder.mimeType || 'audio/webm';
          const finalBlob = new Blob(chunksRef.current, { type: mimeType });

          if (finalBlob.size === 0) {
            resolve(null);
            return;
          }

          console.log(`[AudioRecorder] Recorded ${finalBlob.size} bytes (${mimeType}) in ${duration.toFixed(1)}s`);
          resolve({ blob: finalBlob, mimeType });
        }, 60);
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
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
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
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    recorderError,
  };
}
