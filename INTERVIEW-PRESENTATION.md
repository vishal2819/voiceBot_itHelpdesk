# IT Help Desk Voice Bot - Technical Interview Presentation

> **Project:** AI-Powered Voice Assistant for IT Support Ticketing  
> **Tech Stack:** TypeScript, LiveKit, Next.js, PostgreSQL, Docker  
> **Author:** Vishal | **Date:** February 2026

---

## 📌 Executive Summary (For Non-Technical Audience)

### What Does This Project Do?

This is a **voice-powered AI assistant** that helps customers create IT support tickets by having a **natural phone-like conversation**. Instead of filling out boring web forms, users simply **talk** to the bot.

### The Problem It Solves

- **Traditional ticketing** requires typing, navigation, and form-filling
- **Phone support** requires human agents (expensive, limited hours)
- **Chatbots** feel robotic and frustrating

### My Solution

A voice bot that:

1. **Listens** to what the customer says (Speech-to-Text)
2. **Understands** the request using AI (Large Language Model)
3. **Responds** naturally with voice (Text-to-Speech)
4. **Creates a ticket** automatically in the database

### Real-World Example

```
User: "Hi, I'm John. My laptop is running really slow."
Bot:  "Hello John! I'm sorry to hear that. Let me create a support 
       ticket for your slow laptop issue. That will be $25. 
       Can I have your email address please?"
```

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────┐     ┌─────────────────────────────────────────────────┐
│   Browser   │────▶│              LiveKit Cloud                      │
│  (Next.js)  │◀────│    (Real-time Audio/Video Infrastructure)       │
└─────────────┘     └─────────────────────────────────────────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────────────┐
                    │           Voice Agent (Node.js)               │
                    │                                               │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
                    │  │   STT   │─▶│   LLM   │─▶│   TTS   │       │
                    │  │(Whisper)│  │(Claude/ │  │(OpenAI/ │       │
                    │  │         │  │ Ollama) │  │ Piper)  │       │
                    │  └─────────┘  └─────────┘  └─────────┘       │
                    │                    │                          │
                    │         ┌──────────┴───────────┐              │
                    │         ▼                      ▼              │
                    │  ┌─────────────┐     ┌──────────────┐         │
                    │  │Conversation │     │  Tool        │         │
                    │  │State Machine│     │  Executor    │         │
                    │  └─────────────┘     └──────────────┘         │
                    └───────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌───────────────────┐
                              │   PostgreSQL      │
                              │  (Prisma ORM)     │
                              │                   │
                              │  • Tickets        │
                              │  • Services       │
                              │  • Logs           │
                              └───────────────────┘
```

### The Voice Pipeline (Simple Explanation)

| Step | Component | What Happens | Analogy |
|------|-----------|--------------|---------|
| 1️⃣ | **LiveKit** | Captures microphone audio from browser | Like a phone call connection |
| 2️⃣ | **STT** | Converts speech to text | Like a transcriptionist |
| 3️⃣ | **LLM** | Understands intent, decides response | Like a smart agent thinking |
| 4️⃣ | **TTS** | Converts response text to speech | Like a human speaking back |
| 5️⃣ | **LiveKit** | Streams audio back to browser | Like hearing the agent reply |

---

## 🔧 Technical Deep Dive

### 1. Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, React 19 | Modern web UI with server components |
| **Real-time** | LiveKit RTC | WebRTC-based real-time audio streaming |
| **Backend** | Node.js, Express | API server and business logic |
| **AI - STT** | Deepgram / Whisper.cpp | Convert speech → text |
| **AI - LLM** | Anthropic Claude / Ollama | Natural language understanding |
| **AI - TTS** | OpenAI / Piper | Convert text → speech |
| **Database** | PostgreSQL + Prisma | Type-safe ORM with migrations |
| **DevOps** | Docker Compose | Multi-container orchestration |
| **Validation** | Zod | Runtime type validation |
| **Logging** | Pino | High-performance structured logging |

### 2. Project Structure Explained

```
voiceBot_itHelpdesk/
├── src/
│   ├── agents/           # LiveKit voice agent logic
│   │   └── VoiceAgent.ts # 🔑 Main STT → LLM → TTS pipeline
│   │
│   ├── domain/           # Business logic (Domain-Driven Design)
│   │   ├── conversation/
│   │   │   ├── state.ts           # State machine definition
│   │   │   └── ConversationManager.ts  # State transitions
│   │   └── issue/
│   │       └── IssueClassifier.ts # Hybrid classification logic
│   │
│   ├── services/         # External integrations
│   │   ├── providers/    # STT, LLM, TTS implementations
│   │   │   ├── ProviderFactory.ts     # Factory pattern
│   │   │   ├── AnthropicLLMProvider.ts
│   │   │   ├── OllamaLLMProvider.ts
│   │   │   ├── DeepgramSTTProvider.ts
│   │   │   ├── WhisperCppSTTProvider.ts
│   │   │   ├── OpenAITTSProvider.ts
│   │   │   └── PiperTTSProvider.ts
│   │   ├── tools/        # LLM function calling
│   │   │   └── ToolExecutor.ts
│   │   └── prompts/
│   │       └── systemPrompt.ts
│   │
│   ├── data/             # Data access layer
│   │   └── repositories/
│   │       ├── TicketRepository.ts
│   │       ├── ServiceCatalogRepository.ts
│   │       └── ConversationLogRepository.ts
│   │
│   ├── config/
│   │   └── env.ts        # Zod-validated configuration
│   │
│   └── utils/
│       ├── logger.ts     # Pino structured logging
│       └── validation.ts # Input validators
│
├── frontend/             # Next.js 15 application
│   ├── app/
│   │   ├── page.tsx      # Entry point
│   │   └── api/
│   │       └── connection-details/route.ts  # Token generation
│   └── components/
│       └── VoiceBotApp.tsx  # Main React component
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Version-controlled DB changes
│   └── seed.ts           # Initial data seeding
│
└── docker-compose.yml    # Multi-service orchestration
```

---

## 💡 Key Design Decisions

### 1. State Machine for Conversation Flow

**Why?** Instead of relying purely on LLM to manage conversation flow (unpredictable), I use an explicit state machine.

```typescript
export enum ConversationState {
  GREETING = 'GREETING',
  COLLECTING_NAME = 'COLLECTING_NAME',
  COLLECTING_EMAIL = 'COLLECTING_EMAIL',
  COLLECTING_PHONE = 'COLLECTING_PHONE',
  COLLECTING_ADDRESS = 'COLLECTING_ADDRESS',
  COLLECTING_ISSUE = 'COLLECTING_ISSUE',
  CONFIRMING_DETAILS = 'CONFIRMING_DETAILS',
  TICKET_CREATION = 'TICKET_CREATION',
  CONFIRMATION = 'CONFIRMATION',
  ERROR_RECOVERY = 'ERROR_RECOVERY',
  ENDED = 'ENDED',
}
```

**Benefits:**

- ✅ **Predictable flow** - We always know what state we're in
- ✅ **Debuggable** - Easy to log and trace issues
- ✅ **Testable** - Unit test each transition
- ✅ **Fallback mechanism** - Error recovery state handles edge cases

### 2. Hybrid Issue Classification

**Why?** Pure LLM classification is slow and expensive. I use a 3-tier approach:

```
Priority: Keyword → Semantic → LLM Fallback

1. KEYWORD MATCHING (Fast, Free, Deterministic)
   "wifi not connecting" → matches "wifi" → Wi-Fi Issues ($20)

2. SEMANTIC SIMILARITY (Medium speed)
   When keywords don't match exactly

3. LLM CLARIFICATION (Fallback)
   When uncertain, ask user to choose from 4 options
```

**Code Implementation:**

```typescript
async classify(issueDescription: string): Promise<ClassificationResult> {
  // Step 1: Try keyword-based (fast + free)
  const keywordResult = await this.classifyByKeywords(normalized);
  if (keywordResult?.confidence === 'high') return keywordResult;
  
  // Step 2: Medium confidence - still usable
  if (keywordResult?.confidence === 'medium') return keywordResult;
  
  // Step 3: Need clarification from user
  return { method: 'clarification_needed', confidence: 'low' };
}
```

### 3. Provider Factory Pattern

**Why?** Allows swapping AI providers without changing business logic.

```typescript
// Switch between PAID (cloud) and FREE (local) providers via .env

// Cloud ($$)          →  Local (free)
STT_PROVIDER=deepgram  →  STT_PROVIDER=whispercpp
LLM_PROVIDER=anthropic →  LLM_PROVIDER=ollama
TTS_PROVIDER=openai    →  TTS_PROVIDER=piper
```

**Factory Code:**

```typescript
static createAllProviders() {
  return {
    stt: ProviderFactory.createSTTProvider(),
    llm: ProviderFactory.createLLMProvider(),
    tts: ProviderFactory.createTTSProvider(),
  };
}
```

### 4. LLM Tool Calling (Function Calling)

**What?** Instead of letting LLM output free-form text, I give it specific "tools" it can call.

**Available Tools:**

| Tool | Purpose |
|------|---------|
| `validate_email` | Check if email format is valid |
| `validate_phone` | Check if phone number is valid |
| `classify_issue` | Classify issue → get service type + price |
| `create_ticket` | Create ticket in PostgreSQL database |

**Why This Matters:**

- ✅ **Structured output** - LLM calls functions with typed parameters
- ✅ **Action execution** - Bot can actually DO things (create tickets)
- ✅ **Validation** - Zod schemas validate every tool call

---

## 📊 Database Schema

```prisma
// 3 core tables with proper indexing

model ServiceCatalog {
  id          String   @id
  issueType   String   @unique  // "wifi", "email", "laptop", "printer"
  description String
  price       Decimal            // $10 - $25
  keywords    String[]           // For keyword matching
  isActive    Boolean
}

model Ticket {
  id           String
  ticketNumber String  @unique   // Human-readable: "TKT-ABC123"
  name         String
  email        String
  phone        String
  address      String
  issue        String
  issueType    String?
  price        Decimal
  status       TicketStatus      // CREATED | IN_PROGRESS | RESOLVED
  version      Int               // Optimistic locking
}

model ConversationLog {
  id               String
  sessionId        String          // Links all turns in one call
  conversationState String         // For analytics
  userMessage      String?
  botResponse      String?
  toolCalls        Json?           // Track what tools were called
}
```

---

## 🔄 Conversation Flow (Complete Example)

```
┌─────────────────────────────────────────────────────────────────┐
│  STATE: GREETING                                                │
│  Bot: "Hello! I'm here to help create an IT support ticket."   │
│  Bot: "May I have your name please?"                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: COLLECTING_NAME                                         │
│  User: "Hi, I'm John Doe"                                       │
│  [Validation: ✅ Valid name]                                    │
│  Bot: "Nice to meet you, John! What's your email address?"     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: COLLECTING_EMAIL                                        │
│  User: "john at example dot com"                                │
│  [Tool: validate_email("john@example.com") → ✅]                │
│  Bot: "Got it! What's your phone number?"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: COLLECTING_PHONE                                        │
│  User: "555-123-4567"                                           │
│  [Tool: validate_phone("5551234567") → ✅]                      │
│  Bot: "And your address for our records?"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: COLLECTING_ADDRESS                                      │
│  User: "123 Main Street, San Francisco, CA 94102"               │
│  Bot: "Perfect. Now, what IT issue are you experiencing?"      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: COLLECTING_ISSUE                                        │
│  User: "My laptop has been super slow lately"                   │
│  [Tool: classify_issue("laptop slow") → laptop_performance]     │
│  Result: issueType="laptop", price=$25, confidence="high"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: CONFIRMING_DETAILS                                      │
│  Bot: "Let me confirm your details:                            │
│        Name: John Doe                                           │
│        Email: john@example.com                                  │
│        Phone: (555) 123-4567                                    │
│        Address: 123 Main St, San Francisco, CA 94102            │
│        Issue: Slow laptop performance - $25                     │
│        Is this correct?"                                        │
│  User: "Yes, that's correct"                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: TICKET_CREATION                                         │
│  [Tool: create_ticket({...all fields...})]                      │
│  → Ticket #TKT-X7K9M created in PostgreSQL                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: CONFIRMATION                                            │
│  Bot: "Your ticket #TKT-X7K9M has been created successfully!   │
│        A technician will contact you within 24 hours.           │
│        Is there anything else I can help with?"                 │
│  User: "No, that's all. Thanks!"                                │
│  Bot: "Thank you for calling IT support. Goodbye!"             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE: ENDED                                                   │
│  [Session logged to ConversationLog table]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Run (Docker)

```bash
# 1. Clone and configure
git clone <repo>
cp .env.example .env
# Edit .env with your LiveKit credentials

# 2. Start all 5 services
docker compose up -d

# 3. Download LLM model (one-time, ~5GB)
docker exec voicebot_ollama ollama pull llama3.1

# 4. Open browser
# → http://localhost:3001
```

**Docker Services:**

| Container | Port | Purpose |
|-----------|------|---------|
| `voicebot_api` | 3001 | Backend API + Voice Agent |
| `voicebot_postgres` | 5432 | PostgreSQL database |
| `voicebot_ollama` | 11434 | Local LLM (llama3.1) |
| `voicebot_whisper` | 8080 | Local STT (Whisper) |
| `voicebot_piper` | 5002 | Local TTS (Piper) |

---

## 🧪 Testing Strategy

```bash
npm run test         # Run all tests
npm run lint         # ESLint checking
npm run format:check # Prettier validation
```

**Test Coverage:**

- ✅ **State machine transitions** - Unit tests for valid/invalid transitions
- ✅ **Validation functions** - Email, phone, name format tests
- ✅ **Issue classification** - Keyword matching accuracy

```typescript
// Example test (state.test.ts)
describe('ConversationState', () => {
  it('should allow GREETING → COLLECTING_NAME', () => {
    expect(isValidTransition(
      ConversationState.GREETING, 
      ConversationState.COLLECTING_NAME
    )).toBe(true);
  });
});
```

---

## 📈 Production Considerations

### Security

- ✅ **Environment validation** - Zod validates all env vars at startup
- ✅ **No hardcoded secrets** - All credentials via environment
- ✅ **Optimistic locking** - Prevents race conditions on ticket updates

### Scalability

- ✅ **Stateless agents** - Can spin up multiple agent instances
- ✅ **Database indexing** - Proper indexes on frequently queried columns
- ✅ **Structured logging** - Pino for high-performance log aggregation

### Cost Optimization

- ✅ **Provider flexibility** - Switch to free local providers
- ✅ **Cost tracking** - Built-in API usage cost tracking
- ✅ **Keyword-first classification** - Avoids expensive LLM calls when possible

---

## 🎯 Technical Challenges Solved

### Challenge 1: Voice Activity Detection (VAD)

**Problem:** Knowing when user stopped speaking  
**Solution:** RMS energy calculation + silence threshold detection

```typescript
const rms = this.calculateRMS(frame);
const isSilent = rms < SILENCE_THRESHOLD; // 500 amplitude
if (silentFrameCount >= 25) {  // ~1.5 seconds silence
  // Process speech buffer
}
```

### Challenge 2: Natural Conversation with Structure

**Problem:** LLMs are unpredictable; forms are rigid  
**Solution:** State machine + LLM hybrid

- State machine ensures all fields are collected
- LLM provides natural language generation
- Tools provide deterministic actions

### Challenge 3: Multi-Provider Support

**Problem:** Different AI providers have different APIs  
**Solution:** Provider abstraction with Factory pattern

```typescript
interface LLMProvider {
  complete(messages, tools): Promise<LLMResponse>;
}
// AnthropicLLMProvider implements LLMProvider
// OllamaLLMProvider implements LLMProvider
// Easy to add more: OpenAI, Gemini, etc.
```

---

## 📚 Key Files for Code Review

| File | Lines | Key Concepts |
|------|-------|--------------|
| [VoiceAgent.ts](src/agents/VoiceAgent.ts) | 482 | STT→LLM→TTS pipeline, VAD, audio handling |
| [state.ts](src/domain/conversation/state.ts) | 150 | State machine, transitions, validation |
| [IssueClassifier.ts](src/domain/issue/IssueClassifier.ts) | 156 | Hybrid keyword + confidence scoring |
| [ProviderFactory.ts](src/services/providers/ProviderFactory.ts) | 145 | Factory pattern, provider abstraction |
| [ToolExecutor.ts](src/services/tools/ToolExecutor.ts) | 354 | LLM function calling, tool definitions |
| [systemPrompt.ts](src/services/prompts/systemPrompt.ts) | 152 | LLM behavior instructions |
| [schema.prisma](prisma/schema.prisma) | 75 | Database schema with indexes |
| [VoiceBotApp.tsx](frontend/components/VoiceBotApp.tsx) | 476 | React UI, LiveKit integration |

---

## 🏆 What This Project Demonstrates

| Skill | How It's Demonstrated |
|-------|----------------------|
| **System Design** | Microservices architecture with clear separation |
| **TypeScript** | Strict mode, Zod validation, type-safe Prisma |
| **AI/ML Integration** | Multi-model pipeline (STT + LLM + TTS) |
| **Real-time Systems** | WebRTC audio streaming with LiveKit |
| **Database Design** | Proper schema, indexes, migrations |
| **DevOps** | Docker containerization, multi-service compose |
| **Clean Code** | SOLID principles, proper abstraction layers |
| **Testing** | Unit tests, validation tests |
| **Documentation** | Comprehensive docs and code comments |

---

## ❓ Potential Interview Questions & Answers

### Q: Why LiveKit instead of WebSocket + Web Audio API?

**A:** LiveKit provides production-ready WebRTC infrastructure with low latency (~100ms), automatic codec negotiation, connection recovery, and cross-browser support. Building this from scratch would take months.

### Q: Why not use a single LLM for everything (STT + response + TTS)?

**A:** Specialized models excel at their domain. Whisper is optimized for transcription, Claude for reasoning, and TTS models for natural speech. A single model would be slower and less accurate.

### Q: How do you handle the user speaking over the bot?

**A:** LiveKit handles echo cancellation at the media layer. The VAD in VoiceAgent.ts only processes audio when the bot isn't speaking (controlled by `isProcessing` flag).

### Q: What happens if the database is down?

**A:** The ticket creation tool returns an error, which gets caught by the error handler. The bot apologizes and the conversation transitions to `ERROR_RECOVERY` state, offering to try again or end gracefully.

### Q: How would you scale this to 1000 concurrent calls?

**A:**

1. Run multiple agent containers behind a load balancer
2. Use LiveKit Cloud's auto-scaling infrastructure
3. Add Redis for session state (currently in-memory)
4. Use read replicas for PostgreSQL

---

## 📞 Contact

**Built with 💙 by Vishal**

*Ready for technical deep-dive questions!*
