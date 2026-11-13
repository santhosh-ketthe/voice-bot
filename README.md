# 🎙️ Santhosh — Interactive Voice AI Assistant

A production-grade, low-latency Voice Bot built with **React (Vite + TypeScript)** and **FastAPI**. It showcases an interactive candidate persona grounded in real engineering experience, featuring speech-to-text with Groq Whisper, dual-provider conversational reasoning (Groq `openai/gpt-oss-20b` via OpenAI Responses API with Gemini Flash fallback), and real-time audio synthesis using Edge-TTS.

---

## 1. Architecture & Real-Time Flow

```
User Voice / Text
       │
       ▼
React Client (MediaRecorder / AudioContext)
       │
       ├──► 1. POST /api/transcribe (Audio Blob: webm / mp4)
       │       └──► Groq Whisper Turbo (`whisper-large-v3-turbo`) ──► { text }
       │
       ├──► 2. POST /api/chat { messages }
       │       ├──► In-Memory Fuzzy Cache Match (Instant < 20ms)
       │       ├──► Primary: Groq (`openai/gpt-oss-20b` via client.responses.create)
       │       └──► Fallback: Google Gemini Flash (REST via httpx) ──► { answer }
       │
       └──► 3. POST /api/tts { text, sample_id }
               └──► Edge-TTS (`en-US-ChristopherNeural` audio/mpeg stream)
                       ▼
Plays audio blob (with iOS Web Audio unlock; falls back to browser speechSynthesis)
```

---

## 2. Key Highlights & Production Reliability

- **Dual-Provider LLM Resilience**: Primary inference runs on **Groq with `openai/gpt-oss-20b`** using the OpenAI Responses API (`client.responses.create`) with `base_url="https://api.groq.com/openai/v1"`. If rate limits or timeouts occur, it automatically cascades via Tenacity retries to **Google Gemini Flash**.
- **Instant Pre-Warmed Response Cache**: The 5 canonical starter interview questions use fuzzy string matching and token overlap to return pre-computed text and audio instantly with zero API overhead.
- **Microphone & Codec Robustness**: Detects browser codecs (`audio/webm;codecs=opus` on Chromium/Firefox, `audio/mp4` on Safari/iOS). Rejects recordings < 0.5s to prevent false triggers, and auto-stops after 30s.
- **Audio Context Unlock**: Automatically unlocks the browser Web Audio context on the user's initial interaction to comply with iOS Safari and mobile Chrome autoplay policies.
- **Graceful Fallbacks**: If Edge-TTS fails or network drops, the frontend automatically switches to the browser's native `window.speechSynthesis`. If mic permission is denied, a responsive text input appears automatically.
- **Defense in Depth**:
  - IP-based rate limiting via `slowapi` (`20 requests/min`).
  - Global daily request counter (`1000 requests/day`) to prevent runaway cloud costs.
  - Role whitelisting (client-supplied `system` role strictly rejected).
  - Hardened anti-jailbreak instructions preventing identity shifts or prompt disclosures.
  - Spoken output formatting cleaner removing markdown, asterisks, bullet points, and headers for natural TTS speech.

---

## 3. Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, static file mount, exception handlers
│   │   ├── config.py          # Pydantic BaseSettings, env variables
│   │   ├── ratelimit.py       # SlowAPI limiter & GlobalDailyCounter
│   │   ├── cache.py           # Sample Q&A data, fuzzy matching, audio cache
│   │   ├── persona/
│   │   │   ├── persona.md     # Verified first-person candidate facts
│   │   │   └── prompt.py      # System prompt generator with anti-jailbreak rules
│   │   ├── services/
│   │   │   ├── stt.py         # Groq Whisper STT service with Tenacity retries
│   │   │   ├── llm.py         # Dual LLM engine (Groq Llama 3.3 + Gemini fallback)
│   │   │   └── tts.py         # Edge-TTS streaming service
│   │   └── routers/
│   │       ├── health.py      # GET /api/health (UptimeRobot / Render pings)
│   │       ├── transcribe.py  # POST /api/transcribe
│   │       ├── chat.py        # POST /api/chat
│   │       ├── tts.py         # POST /api/tts
│   │       └── samples.py     # GET /api/samples
│   ├── requirements.txt
│   └── tests/
│       ├── test_health.py     # Health and SPA mounting tests
│       └── test_chat.py       # LLM sanitization, prompt injection defense, fuzzy cache
├── frontend/                  # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/        # MicButton, Transcript, StarterChips, StatusBar, TextInput, AudioVisualizer
│   │   ├── hooks/             # useRecorder, useAudioPlayer, useVoiceBot (State Machine)
│   │   ├── api.ts             # Typed API client
│   │   ├── types.ts           # Shared interfaces and BotState
│   │   ├── App.tsx            # Main responsive layout
│   │   └── index.css          # Tailwind and glowing audio animations
│   ├── package.json
│   └── vite.config.ts         # Dev server with /api proxy
├── Dockerfile                 # Multi-stage production build (Node 20 -> Python 3.11)
├── .dockerignore
├── .env.example
└── pytest.ini
```

---

## 4. Local Development Quickstart

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Step 1: Environment Variables
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```
Fill in your API keys:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
APP_ENV=development
```

### Step 2: Run Backend
```bash
# Create and activate virtual environment
python -m venv backend/.venv
# On Windows:
backend\.venv\Scripts\activate
# On macOS/Linux:
source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### Step 3: Run Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. The Vite development proxy will route all `/api/*` calls directly to FastAPI on port 8000.

---

## 5. Running Automated Backend Tests

```bash
# Run pytest suite
backend\.venv\Scripts\pytest backend/tests -v
```
All 10 unit and integration tests run in ~1.5 seconds covering:
1. Markdown stripping & spoken text sanitizer
2. System prompt construction & persona facts integrity
3. Fuzzy matching across natural conversational phrasing
4. Starter chips `/api/samples` endpoint
5. Instant cache hit on sample questions
6. Pydantic request validation on empty messages
7. Anti-jailbreak role whitelisting (rejecting client `system` messages)
8. Fuzzy matching across all 5 sample categories
9. Health endpoint uptime & quota metrics
10. Single-page application root routing

---

## 6. Single-Container Production Docker Deployment

Deploy seamlessly to **Render** or **Hugging Face Spaces (Docker)** using the multi-stage Dockerfile:

```bash
# Build the production Docker image
docker build -t voicebot .

# Run the container
docker run -p 8000:8000 -e GROQ_API_KEY="your-key" -e GEMINI_API_KEY="your-key" voicebot
```
The Docker container compiles the React SPA into static assets and FastAPI automatically serves both the API endpoints (`/api/*`) and the built frontend from one single URL with no CORS complexity.

### Avoiding Cold Starts on Render Free Tier
1. Point a free **UptimeRobot** monitor to `https://<your-render-url>/api/health` with a 5-minute ping interval.
2. The `/api/health` endpoint returns a lightweight `{ "ok": true, "status": "healthy" }` response without consuming LLM tokens.

---

## 7. API Reference

| Endpoint | Method | Input | Output | Description |
|---|---|---|---|---|
| `/api/health` | `GET` | None | `{ ok, status, uptime_seconds, quota }` | Health probe & uptime monitor |
| `/api/samples` | `GET` | None | `{ samples: [...] }` | 5 starter questions with pre-computed answers |
| `/api/transcribe` | `POST` | `multipart/form-data` (`audio`) | `{ text }` | Groq Whisper speech transcription |
| `/api/chat` | `POST` | `{ messages: [{ role, content }] }` | `{ answer, source, sample_id }` | Conversational persona engine |
| `/api/tts` | `POST` | `{ text, sample_id? }` | `audio/mpeg` | Edge-TTS streaming audio |

---

## 8. Verified Persona Context

- **Candidate**: Santhosh (AI & Full-Stack Engineer)
- **Background**: B.Tech in Computer Science; 3 years at Covalense Global; 2 years deep specialization in Generative AI, real-time voice architectures, and agentic systems.
- **Superpower**: Rapid end-to-end prototyping combined with relentless production hardening and latency reduction (e.g., sub-600ms conversational pipelines).
- **Growth Areas**: Low-level CUDA/Triton GPU inference kernels, Direct Preference Optimization (DPO), and formal verification of multi-agent state machines.
- **Limits / Failure**: An early rate-limit exhaustion taught the necessity of multi-tier fallback LLMs, client-side token caps, and pre-warmed caching.
- **Interview Response Style**: 3-5 conversational sentences (~50-80 words max), spoken first-person, strictly no markdown or bullet points.

