# IT Help Desk Voice Bot

Production-ready LiveKit voice bot for IT help desk support. Built with TypeScript (strict), LiveKit RTC, and PostgreSQL via Prisma.

## Features

- **Voice Conversation Flow**: Natural voice interaction using LiveKit RTC
- **4 IT Services**: Wi-Fi ($20), Email ($15), Laptop Performance ($25), Printer ($10)
- **Intelligent Issue Classification**: Hybrid keyword + semantic + LLM approach
- **State Machine**: Robust conversation flow with edge case handling
- **Production-Grade**: Strict TypeScript, logging, error handling, testing
- **Flexible Providers**: Choose between cloud (paid) or local (free) AI services

## Quick Start

### Option 1: Docker (Recommended)

Run with **free local AI providers** (Ollama, Whisper, Piper):

```bash
# Clone and setup
cp .env.example .env
# Edit .env with your LiveKit credentials

# Start all services
docker compose up -d

# Pull Ollama model (one-time, ~5GB download)
docker exec voicebot_ollama ollama pull llama3.1

# Open http://localhost:3001 in browser
```

### Option 2: Development Setup

```bash
# Install dependencies
npm install

# Setup database (requires Docker for PostgreSQL)
docker compose up -d postgres

# Configure environment
cp .env.example .env
# Edit .env with API keys

# Run migrations and seed
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Start development server
npm run dev
```

## Provider Options

| Service | Cloud (Paid) | Local (Free) |
|---------|-------------|--------------|
| **STT** | Deepgram | Whisper.cpp |
| **LLM** | Anthropic Claude | Ollama (llama3.1) |
| **TTS** | OpenAI | Piper |

Configure in `.env` - see `.env.example` for all options.

## Project Structure

```
src/
├── agents/          # LiveKit agent pipeline (STT→LLM→TTS)
├── config/          # Environment config & validation
├── data/            # Prisma repositories & database access
│   └── repositories/
├── domain/          # Business logic (state machine, classification)
├── services/        # External providers (STT, LLM, TTS, tools)
│   ├── providers/
│   ├── tools/
│   └── prompts/
├── utils/           # Logger, validation, helpers
web/                 # Demo client UI
```

## Scripts

- `npm run dev` - Start dev server with hot reload
- `npm run build` - Compile TypeScript to production
- `npm run start` - Run compiled production build
- `npm run lint` - Lint code with ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run Jest test suite
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed service catalog

## Architecture Decisions

### Why LiveKit?

- Low-latency real-time audio streaming
- Production-ready with WebRTC
- Simple integration with web clients
- Free tier available

### Why Not Just LLM?

As emphasized in requirements: "relying on LLM completely will fail most cases"

- **Deterministic validation**: Email/phone regex patterns
- **Keyword-based classification**: Primary classifier for 4 issue types
- **State machine**: Explicit conversation flow, not LLM-driven
- **LLM as fallback**: Used for unclear cases only

### Database Design

- **Optimistic locking**: Version field prevents concurrent update conflicts
- **Indexed fields**: Fast lookups on email, status, ticket number
- **Conversation logs**: Full debugging trail with tool calls

## Testing

Run all tests:

```bash
npm run test
```

Coverage report:

```bash
npm run test -- --coverage
```

## Deployment

See [docs/deploy.md](docs/deploy.md) for production deployment guide.

## Development Notes

- **TypeScript strict mode**: All code is strictly typed
- **Structured logging**: JSON logs with correlation IDs
- **Error handling**: Custom error types for each layer
- **Cost tracking**: Monitor API usage to stay in free tiers
