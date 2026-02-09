# Voice Bot Demo Script (Local AI Edition)

## 🎥 Setup Instructions

### 1. Start Docker Services (Terminal 1)

Ensure all local AI containers (Ollama, Whisper, Piper) are running.

```bash
docker compose up -d
# Wait for containers to be healthy
docker compose ps
# Ensure Ollama model is ready (run once)
docker exec voicebot_ollama ollama pull llama3.1
```

### 2. Start Frontend (Terminal 2)

Runs the Next.js UI on port 3002.

```bash
cd frontend
npm run dev
```

### 3. Start Voice Bot (Terminal 3)

Runs the logic layer. Note: We use a special script to handle local networking between Host and Docker.

```bash
npx tsx src/run-bot.ts
```

### 4. Connect

Open `http://localhost:3002` in your browser. Enter a name and click **Connect**.

---

## 🗣️ Demo Script + Talking Points

### 1. Introduction (30 seconds)

"Welcome to the IT Help Desk Voice Bot. This is a **fully local, privacy-first** implementation that runs entirely on-premise without sending data to external cloud providers (except for the WebRTC transport via LiveKit).

Our stack includes:

- **LiveKit** for real-time audio streaming.
- **Whisper (via Docker)** for local Speech-to-Text.
- **Ollama (Llama 3.1)** for local intelligence.
- **Piper TTS (custom microservice)** for low-latency local voice synthesis."

### 2. Architecture & Edge Case Handling (1 minute)

"I built this system to be robust and deterministic. We do **not** rely solely on the LLM, which can be unpredictable. Instead, we use a hybrid approach:"

**Show Code:** `src/domain/conversation/state.ts`
> "This State Machine enforces a strict flow. The LLM cannot hallucinate a jump from 'Greeting' to 'Ticket Creation' without passing through specific validation steps."

**Show Code:** `src/domain/issue/IssueClassifier.ts`
> "For issue classification, we prioritize **Keyword Matching** over Semantic Search. If a user says 'printer', we map it instantly with 100% confidence. Only ambiguous queries go to the LLM, and even then, we require a high confidence threshold or we ask clarifying questions."

### 3. Live Demo - Happy Path (2 minutes)

*Performance Note: Since we are running AI locally on CPU, there may be a 1-2 second pause between turns.*

1. **Greeting:** Bot asks for name.
    - *User:* "Hi, I'm [Your Name]."
2. **Contact Info:** Bot asks for email and phone.
    - *User:* "[yourname]@company.com"
    - *User:* "555-0123"
3. **Issue:** Bot asks for the problem.
    - *User:* "My printer is jammed again." (Triggers keyword match)
4. **Confirmation & Ticket:** Bot summarizes and gives a price ($10).
    - *User:* "Yes, go ahead."

### 4. Technical Deep Dive (1 minute)

**Highlight 1: Resilient Networking**
> "One challenge we solved was networking between the Windows Host and Docker containers. We implemented a dynamic configuration loader (`src/run-bot.ts`) that automatically bridges `localhost` ports for debugging while preserving internal Docker DNS for production deployment. This handles the 'works on my machine' edge case."

**Highlight 2: Custom Microservices**
> "We encountered protocol incompatibilities with standard TTS containers. To fix this, I engineered a custom microservice wrapper for the Piper TTS engine (in `piper-service/`) that provides a standardized HTTP API, ensuring reliable audio synthesis regardless of the underlying binary."

### 5. Deployment Verified

"We verify deployment readiness with a robust test suite:"

```bash
npm test
```

(Show that tests pass, validating the state machine logic)
