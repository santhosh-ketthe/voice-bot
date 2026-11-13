export type BotState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  source?: string;
}

export interface SampleQuestion {
  id: string;
  question: string;
  short_label: string;
  answer: string;
  has_cached_audio?: boolean;
}

export interface APIErrorDetail {
  error: string;
  userMessage: string;
  code?: string;
}

export interface ChatApiResponse {
  answer: string;
  source: string;
  sample_id?: string;
}

export interface TranscribeApiResponse {
  text: string;
}

export interface HealthApiResponse {
  ok: boolean;
  status: string;
  uptime_seconds: number;
  quota?: {
    date: string;
    count: number;
    limit: number;
    remaining: number;
  };
}
