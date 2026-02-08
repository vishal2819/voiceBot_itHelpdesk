# Voice Bot Demo Script

## Setup Instructions

### 1. Start PostgreSQL Database

```bash
docker compose up -d
```

### 2. Run Database Migrations

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 3. Configure Environment

Update `.env` with your API keys:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
DEEPGRAM_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### 4. Start the Voice Bot Server

```bash
npm run dev
```

### 5. Open the Web Client

Open `web/index.html` in your browser (or serve with a local HTTP server)

## Demo Flow

### Introduction (30 seconds)

"Welcome to the IT Help Desk Voice Bot demo. This production-ready system uses:

- LiveKit for real-time voice streaming
- Deepgram for Speech-to-Text
- Claude Haiku for conversation management
- OpenAI TTS for natural voice responses
- PostgreSQL for ticket storage"

### Architecture Walkthrough (1 minute)

Show the codebase structure:

1. **src/agents/** - Voice pipeline integration
2. **src/domain/** - State machine and issue classifier
3. **src/services/** - Provider factories and tools
4. **src/data/** - Repository pattern with Prisma

Highlight:

- Strict TypeScript with comprehensive types
- Deterministic validation (not relying on LLM alone)
- Keyword-based issue classification
- Tool calling system for structured actions

### Live Demo - Happy Path (2 minutes)

**Start the call and demonstrate full flow:**

1. **Greeting**
   - Bot: "Hello! I'm here to help you create an IT support ticket. May I have your name please?"
   - User: "My name is Sarah Chen"

2. **Collect Email**
   - Bot: "Great, Sarah Chen! What's your email address?"
   - User: "<sarah.chen@company.com>"

3. **Collect Phone**
   - Bot: "Thank you. What's your phone number?"
   - User: "510-555-1234"

4. **Collect Address**
   - Bot: "And your address?"
   - User: "123 Oak Street, San Francisco, CA 94102"

5. **Collect Issue**
   - Bot: "What IT issue are you experiencing?"
   - User: "My laptop has been running very slow lately"

6. **Confirmation**
   - Bot: "Let me confirm: Your name is Sarah Chen, email <sarah.chen@company.com>..."
   - User: "Yes, that's correct"

7. **Ticket Creation**
   - Bot: "Perfect! I've created ticket #XYZ123. The service cost is $25. You'll receive a confirmation email shortly."

Show the database record in Prisma Studio.

### Edge Case Demonstrations (2 minutes)

#### Case 1: Invalid Email

- User: "my email is sarah at company dot com"
- Bot: "I couldn't validate that email format. Please provide it like <user@example.com>"

#### Case 2: User Provides Multiple Fields at Once

- User: "Hi, I'm John Doe, email <john@example.com>, I need help with my printer"
- Bot: "Thank you John! I have your email. Let me get your phone number..."

#### Case 3: Unclear Issue (Triggers Clarification)

- User: "My computer isn't working right"
- Bot: "I'd like to confirm which issue: 1. Wi-Fi problems ($20), 2. Email login ($15), 3. Slow performance ($25), 4. Printer ($10)"

#### Case 4: User Wants to Correct Information

- User: "Wait, change my phone number to 415-555-9999"
- Bot: "I've updated your phone number. Let me confirm all details again..."

### Code Highlights (1 minute)

Show in VS Code:

1. **State Machine** (`src/domain/conversation/state.ts`)
   - 11 explicit states with validated transitions
   - getMissingFields() for recovery

2. **Issue Classifier** (`src/domain/issue/IssueClassifier.ts`)
   - Keyword matching (primary)
   - Confidence scoring
   - Clarification prompts

3. **Validation** (`src/utils/validation.ts`)
   - Regex-based email/phone validation
   - Type guards and sanitization

4. **Tool System** (`src/services/tools/ToolExecutor.ts`)
   - Zod schema validation
   - Structured LLM function calling

### Technical Highlights (30 seconds)

"Key architectural decisions:

- **Not LLM-dependent**: Validation and classification use deterministic logic
- **Production-ready**: Logging, error handling, cost tracking, optimistic locking
- **Type-safe**: Strict TypeScript throughout
- **Testable**: Repository pattern, dependency injection
- **Observable**: Structured logging with Pino, conversation logs for debugging"

## Testing After Demo

```bash
# Run tests
npm test

# Check linting
npm run lint

# Build for production
npm run build

# View database
npx prisma studio
```

## Deployment Notes

Mention deployment options:

- **Backend**: Render/Railway with managed PostgreSQL
- **LiveKit**: LiveKit Cloud free tier (1000 min/month)
- **Costs**: Optimized for free tiers (Deepgram, Claude Haiku, OpenAI TTS)

## Q&A Points

- Why LiveKit? Low latency, WebRTC, production-ready
- Why not just LLM? Unreliable for validation/structured data
- State machine vs. prompt engineering? Explicit control flow
- Scalability? Repository pattern, connection pooling, horizontal scaling ready
