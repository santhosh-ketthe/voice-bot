import {
  APIErrorDetail,
  ChatApiResponse,
  HealthApiResponse,
  SampleQuestion,
  TranscribeApiResponse,
} from './types';

const API_BASE = '/api';

/** Helper to extract structured error messages from backend responses */
async function handleResponseError(res: Response): Promise<never> {
  let errorDetail: APIErrorDetail = {
    error: `HTTP ${res.status}: ${res.statusText}`,
    userMessage: 'Unable to communicate with the server. Please check your connection.',
  };

  try {
    const data = await res.json();
    if (data && (data.userMessage || data.error)) {
      errorDetail = {
        error: data.error || 'Server error',
        userMessage: data.userMessage || data.error,
        code: data.code,
      };
    }
  } catch {
    // Non-JSON response, fallback to status
  }

  throw errorDetail;
}

export async function checkHealth(): Promise<HealthApiResponse> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) await handleResponseError(res);
    return await res.json();
  } catch (err) {
    if ((err as APIErrorDetail).userMessage) throw err;
    throw {
      error: 'Network error',
      userMessage: 'Backend is waking up or unreachable. Please wait a moment.',
    } as APIErrorDetail;
  }
}

export async function fetchSamples(): Promise<SampleQuestion[]> {
  try {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) await handleResponseError(res);
    const data = await res.json();
    return data.samples || [];
  } catch (err) {
    console.warn('Failed to load pre-warmed samples:', err);
    return [];
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  filename: string = 'recording.webm'
): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, filename);

  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    await handleResponseError(res);
  }

  const data: TranscribeApiResponse = await res.json();
  return data.text;
}

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ChatApiResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    await handleResponseError(res);
  }

  return await res.json();
}

export async function fetchTTSAudio(
  text: string,
  sampleId?: string
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, sample_id: sampleId }),
  });

  if (!res.ok) {
    await handleResponseError(res);
  }

  return await res.blob();
}
