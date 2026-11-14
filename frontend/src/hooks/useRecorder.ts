import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface UseRecorderResult {
  isRecording: boolean;
  isPermissionDenied: boolean;
  recordingDuration: number;
  audioLevel: number;
  activeMicLabel: string;
  availableDevices: AudioInputDevice[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
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
  const [activeMicLabel, setActiveMicLabel] = useState<string>('Default Microphone');
  const [availableDevices, setAvailableDevices] = useState<AudioInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterTrackRef = useRef<MediaStreamTrack | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Volume analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeCheckIntervalRef = useRef<number | null>(null);

  // Enumerate input devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
      setAvailableDevices(audioInputs);
    } catch (e) {
      console.warn('[AudioRecorder] Failed to list devices:', e);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [refreshDevices]);

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

    if (meterTrackRef.current) {
      try {
        meterTrackRef.current.stop();
      } catch {
        // ignore
      }
      meterTrackRef.current = null;
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
    setAudioLevel(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      // Request microphone stream using chosen device if specified
      const audioConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch {
        // Fallback to basic audio constraint if exact device fails
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) {
        throw new Error('No audio input track found.');
      }
      tracks[0].enabled = true;
      setActiveMicLabel(tracks[0].label || 'Default Microphone');
      console.log(`[AudioRecorder] Connected mic: "${tracks[0].label}" (muted: ${tracks[0].muted}, state: ${tracks[0].readyState})`);

      // Refresh devices now that permissions are granted (labels are now visible)
      refreshDevices();

      // ISOLATED METER: Clone track so Web Audio API never touches MediaRecorder track
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const meterTrack = tracks[0].clone();
          meterTrackRef.current = meterTrack;
          const meterStream = new MediaStream([meterTrack]);

          const source = audioCtx.createMediaStreamSource(meterStream);
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
            const normalized = Math.min(100, Math.round((avg / 80) * 100));
            setAudioLevel(normalized);
          }, 80);
        }
      } catch (audioErr) {
        console.warn('[AudioRecorder] Volume meter unavailable:', audioErr);
      }

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
      };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording cleanly without timeslicing for pristine, non-corrupted container headers
      recorder.start();
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
  }, [selectedDeviceId, refreshDevices, cleanupStream]);

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

        if (!chunksRef.current || chunksRef.current.length === 0) {
          console.warn('[AudioRecorder] onstop: No audio chunks received.');
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const finalBlob = new Blob(chunksRef.current, { type: mimeType });

        console.log(`[AudioRecorder] Recorded ${finalBlob.size} bytes (${mimeType}) in ${duration.toFixed(1)}s`);
        resolve({ blob: finalBlob, mimeType });
      };

      if (recorder.state === 'recording') {
        // Calling stop() cleanly flushes the final audio buffer into ondataavailable before onstop fires
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
    activeMicLabel,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    startRecording,
    stopRecording,
    cancelRecording,
    recorderError,
  };
}
