# IT Help Desk Voice Bot - Modernized Architecture

A modern, production-ready AI-powered voice assistant for IT support built with **Next.js**, **LiveKit**, and **Node.js microservices**. Features real-time voice interaction using advanced speech recognition, natural language processing, and text-to-speech technologies.

> **🎉 Recently Updated**: Fully modernized with React/Next.js frontend, microservices architecture, and @livekit/components-react integration following LiveKit best practices.

## 🎯 Features

- **Modern React Frontend**: Built with Next.js 15 and @livekit/components-react
- **Real-time Voice Interaction**: Natural conversation flow with AI assistant
- **Microservices Architecture**: Separate API server, agent service, and frontend
- **Real-time State Visualization**: Agent state indicators (listening, thinking, speaking)
- **Multi-Provider Support**: 
  - STT: Deepgram, OpenAI Whisper, Whisper.cpp (local)
  - LLM: Anthropic Claude, OpenAI GPT, Ollama (local)
  - TTS: OpenAI, ElevenLabs, Piper (local)
- **Intelligent Issue Classification**: Automatic categorization and pricing
- **Ticket Management**: Create, track, and manage support tickets
- **Cost Tracking**: Monitor API usage and costs
- **Production-Ready**: TypeScript, Docker, PostgreSQL with Prisma

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Frontend (Next.js + React)        │
│    @livekit/components-react UI Layer     │
│              Port: 3002                     │
└──────────────┬──────────────────────────────┘
               │
               │ HTTP API Calls
               │
┌──────────────▼──────────────────────────────┐
│         API Server (Express)               │
│        - Token Generation                  │
│        - Health Checks                     │
│              Port: 3001                     │
└─────────────────────────────────────────────┘
               │
               │ LiveKit WebSocket
               │
┌──────────────▼──────────────────────────────┐
│      LiveKit Cloud / Server                │
│        Room Management                      │
└──────────────┬──────────────────────────────┘
               │
               │ Agent Dispatch
               │
┌──────────────▼──────────────────────────────┐
│      Agent Service (Standalone)            │
│   Voice Agent (STT → LLM → TTS)           │
│         Background Process                  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      PostgreSQL Database (Docker)          │
│   Tickets, Logs, Service Catalog          │
└─────────────────────────────────────────────┘
```

## 📁 Project Structure

```
voiceBot_itHelpdesk/
├── frontend/                    # Next.js application
│   ├── app/
│   │   ├── api/
│   │   │   └── connection-details/  # Token endpoint
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   └── globals.css             # Global styles
│   ├── components/
│   │   └── VoiceBotApp.tsx         # Main app component
│   ├── package.json
│   ├── next.config.js
│   └── Dockerfile
│
├── agent-service/               # Standalone agent service
│   ├── src/
│   │   ├── agent.ts            # Agent entry point
│   │   └── VoiceAgent.ts       # Voice agent logic
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── src/                         # Backend API server
│   ├── agents/
│   │   ├── server.ts           # Express API
│   │   └── VoiceAgent.ts       # Shared agent code
│   ├── config/
│   │   └── env.ts              # Environment config
│   ├── data/
│   │   ├── db.ts
│   │   └── repositories/       # Prisma repositories
│   ├── domain/
│   │   ├── conversation/       # State machine
│   │   └── issue/              # Classification
│   ├── services/
│   │   ├── providers/          # STT/LLM/TTS
│   │   ├── tools/              # Tool executor
│   │   └── prompts/            # System prompts
│   └── utils/
│       ├── logger.ts
│       └── validation.ts
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # DB migrations
│   └── seed.ts                 # Seed data
│
├── docs/
│   ├── deploy.md               # Deployment guide
│   ├── MIGRATION.md            # Migration guide
│   └── database-setup.md       # Database guide
│
├── docker-compose.yml          # Multi-service setup
├── package.json                # Backend dependencies
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- LiveKit account ([free tier available](https://livekit.io))
- API keys:
  - [Deepgram](https://deepgram.com) (STT) - Free $200 credit
  - [Anthropic](https://anthropic.com) or [OpenAI](https://openai.com) (LLM)
  - [OpenAI](https://openai.com) (TTS)

### Installation

1. **Clone and navigate**
```bash
git clone <repository-url>
cd voiceBot_itHelpdesk
```

2. **Set up environment variables**

Root `.env`:
```env
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voicebot?schema=public

# STT Provider
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_deepgram_key

# LLM Provider
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
LLM_MODEL=claude-3-haiku-20240307

# TTS Provider
TTS_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy

# Optional: Cost Tracking
COST_TRACKING_ENABLED=true
```

Frontend `frontend/.env.local`:
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Install dependencies**

```bash
# Backend API
npm install

# Frontend
cd frontend
npm install
cd ..

# Agent Service
cd agent-service
npm install
cd ..
```

4. **Start with Docker (Recommended)**

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

5. **Or start services individually**

```bash
# Terminal 1: Database
docker compose up -d postgres

# Terminal 2: API Server
npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev

# Terminal 4: Agent Service
cd agent-service && npm run dev
```

6. **Access the application**

- **Frontend**: http://localhost:3002
- **API**: http://localhost:3001/health

## 🎮 Usage

1. Open http://localhost:3002
2. Enter your name
3. Click **"Start Voice Call"**
4. Allow microphone access when prompted
5. Start speaking with the AI assistant

### Conversation Flow

```
1. Greeting → "Hello! I'm here to help you create an IT support ticket."
2. Name → "May I have your name please?"
3. Issue → "What issue are you experiencing?"
4. Classification → "I can help you with [Wi-Fi/Email/Laptop/Printer]"
5. Contact → "Could you provide your phone number and email?"
6. Confirmation → "Ticket #1234 created. Price: $20"
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test validation.test.ts

# Watch mode
npm test -- --watch
```

## 📊 API Endpoints

### Frontend API

**POST /api/connection-details**
```typescript
// Request
{
  "participantName": "John Doe"
}

// Response
{
  "serverUrl": "wss://your-project.livekit.cloud",
  "roomName": "helpdesk_room_1234",
  "participantName": "John Doe",
  "participantToken": "eyJhbGc..."
}
```

### Backend API

**GET /health**
```typescript
// Response
{
  "status": "healthy",
  "timestamp": "2026-02-08T10:00:00.000Z",
  "services": {
    "database": "connected",
    "stt": "deepgram",
    "llm": "anthropic",
    "tts": "openai"
  }
}
```

## 🔧 Configuration

### Provider Options

| Service | Providers | Recommended |
|---------|-----------|-------------|
| **STT** | Deepgram, OpenAI Whisper, Whisper.cpp | Deepgram |
| **LLM** | Anthropic Claude, OpenAI GPT, Ollama | Claude Haiku |
| **TTS** | OpenAI, ElevenLabs, Piper | OpenAI |

### Local Development (Free Options)

```env
# Use local services (no API costs)
STT_PROVIDER=whispercpp
WHISPER_BASE_URL=http://localhost:8080

LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

TTS_PROVIDER=piper
PIPER_BASE_URL=http://localhost:5002
```

Start local services:
```bash
docker compose up -d ollama whispercpp piper
```

## 📦 Docker Services

```yaml
services:
  postgres     # Database (Port 5432)
  api          # Express API (Port 3001)
  frontend     # Next.js (Port 3002)
  agent        # Voice Agent (Background)
  ollama       # Local LLM (Port 11434)
  whispercpp   # Local STT (Port 8080)
  piper        # Local TTS (Port 5002)
```

## 🚀 Deployment

See [docs/deploy.md](docs/deploy.md) for detailed deployment instructions.

### Quick Deploy

```bash
# Production build
docker compose up -d --build

# Check all services
docker compose ps

# Monitor logs
docker compose logs -f
```

### Cloud Deployment

- **Frontend**: Deploy to [Vercel](https://vercel.com)
- **Backend**: Deploy to [Railway](https://railway.app), [Render](https://render.com), or AWS
- **Database**: Use managed PostgreSQL (RDS, Cloud SQL, etc.)
- **Agent**: Run as background service on your infrastructure

## 📚 Documentation

- [Deployment Guide](docs/deploy.md) - Production deployment
- [Migration Guide](docs/MIGRATION.md) - Upgrading from old architecture
- [Database Setup](docs/database-setup.md) - Database configuration

## 🔄 Recent Updates

### Modernization (Feb 2026)

- ✅ Migrated to Next.js 15 + React 19
- ✅ Integrated @livekit/components-react
- ✅ Separated agent service from API server
- ✅ Added real-time state visualization
- ✅ Implemented microservices architecture
- ✅ Improved error handling and UX
- ✅ Added comprehensive documentation

See [MIGRATION.md](docs/MIGRATION.md) for detailed changes.

## 🐛 Troubleshooting

### Common Issues

**Agent not joining room**
```bash
# Check agent service logs
docker compose logs agent

# Verify LiveKit credentials
docker compose exec api env | grep LIVEKIT
```

**Microphone not working**
- Check browser permissions
- Ensure HTTPS or localhost
- Test with different browser

**Database connection failed**
```bash
# Check PostgreSQL
docker compose ps postgres

# Run migrations
npx prisma migrate deploy
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🆘 Support

- Report issues: [GitHub Issues](https://github.com/your-repo/issues)
- Documentation: [docs/](docs/)
- LiveKit Docs: [docs.livekit.io](https://docs.livekit.io)

## 🎯 Roadmap

- [ ] Web Speech API fallback for browsers without WebRTC
- [ ] Multi-language support
- [ ] Admin dashboard for ticket management
- [ ] Analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Knowledge base integration

---

**Built with ❤️ using LiveKit, Next.js, and Node.js**
