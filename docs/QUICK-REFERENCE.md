# Quick Reference Card 🚀

## Port Map
- **Frontend**: http://localhost:3002 (Next.js)
- **API**: http://localhost:3001 (Express)
- **Database**: localhost:5432 (PostgreSQL)
- **Ollama**: http://localhost:11434 (Optional)
- **Whisper**: http://localhost:8080 (Optional)
- **Piper**: http://localhost:5002 (Optional)

## Service Start Commands

### Docker (Recommended)
```bash
docker compose up -d                    # Start all services
docker compose up -d --build            # Rebuild and start
docker compose down                     # Stop all services
docker compose ps                       # Check status
docker compose logs -f                  # View logs
docker compose logs -f frontend         # View specific service
```

### Local Development
```bash
# Backend API (Terminal 1)
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev

# Agent Service (Terminal 3)
cd agent-service
npm run dev
```

## Install Commands
```bash
npm install                     # Backend dependencies
cd frontend && npm install      # Frontend dependencies
cd agent-service && npm install # Agent dependencies
```

## Database Commands
```bash
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Run migrations in dev
npx prisma migrate deploy      # Run migrations in prod
npx prisma db seed            # Seed database
npx prisma studio             # Open database GUI
```

## Environment Files Needed
```
.env                    # Root (API & Agent)
frontend/.env.local     # Frontend
```

## Key Directories
```
frontend/               # Next.js app (Port 3002)
  ├── app/             # Pages and API routes
  └── components/      # React components

agent-service/         # Standalone agent (Background)
  └── src/            # Agent implementation

src/                   # Backend API (Port 3001)
  ├── agents/         # API server
  ├── config/         # Configuration
  └── services/       # STT/LLM/TTS providers

prisma/               # Database schema & migrations
```

## Docker Service Names
- `voicebot_frontend` - Next.js UI
- `voicebot_api` - Express API
- `voicebot_agent` - Voice Agent
- `voicebot_postgres` - Database
- `voicebot_ollama` - Local LLM (optional)
- `voicebot_whisper` - Local STT (optional)
- `voicebot_piper` - Local TTS (optional)

## Common Tasks

### Restart Frontend
```bash
docker compose restart frontend
# or locally:
cd frontend && npm run dev
```

### Restart API
```bash
docker compose restart api
# or locally:
npm run dev
```

### View Agent Logs
```bash
docker compose logs -f agent
```

### Check All Services
```bash
docker compose ps
curl http://localhost:3001/health
```

### Rebuild Everything
```bash
docker compose down
docker compose up -d --build --force-recreate
```

### Clean Docker
```bash
docker compose down -v        # Remove volumes
docker system prune -a        # Clean Docker system
```

## Testing Connectivity

### Test API
```bash
curl http://localhost:3001/health
```

### Test Database
```bash
docker exec -it voicebot_postgres psql -U postgres -d voicebot
# Inside psql:
\dt                # List tables
SELECT COUNT(*) FROM "ServiceCatalog";
\q                 # Exit
```

### Test Frontend
Open http://localhost:3002 in browser

## Environment Variables Quick Check
```bash
# Windows PowerShell
Get-Content .env | Select-String LIVEKIT

# Linux/Mac
cat .env | grep LIVEKIT
```

## Troubleshooting Quick Fixes

### Port Already in Use
```powershell
# Windows - Find process using port
netstat -ano | findstr :3002
# Kill process by PID
taskkill /PID <PID> /F
```

### Permission Denied (Docker)
```bash
# Run as admin or use sudo
sudo docker compose up -d
```

### Module Not Found
```bash
npm install              # Backend
cd frontend && npm install
cd agent-service && npm install
```

### Database Connection Failed
```bash
docker compose up -d postgres
npx prisma migrate deploy
```

### Agent Not Connecting
```bash
# Check logs
docker compose logs agent

# Verify environment
docker compose exec agent env | grep LIVEKIT
```

## API Endpoints

### Frontend API
```
POST /api/connection-details
GET /api/*  (Next.js API routes)
```

### Backend API
```
GET  /health            # Health check
POST /token             # Generate LiveKit token
POST /webhook/livekit   # LiveKit webhooks
```

## Testing Flow

1. ✅ Start services: `docker compose up -d`
2. ✅ Check health: `curl http://localhost:3001/health`
3. ✅ Open frontend: http://localhost:3002
4. ✅ Enter name and click "Start Voice Call"
5. ✅ Allow microphone access
6. ✅ Speak with agent
7. ✅ Check transcript and state indicators
8. ✅ Verify ticket creation

## File Locations

### Configuration
- `frontend/next.config.js` - Next.js config
- `src/config/env.ts` - Backend environment
- `agent-service/.env` - Agent config
- `.env` - Root environment variables

### Entry Points
- `frontend/app/page.tsx` - Frontend home
- `src/agents/server.ts` - API server
- `agent-service/src/agent.ts` - Agent service
- `src/index.ts` - Backend entry

### Key Components
- `frontend/components/VoiceBotApp.tsx` - Main UI
- `src/agents/VoiceAgent.ts` - Agent logic
- `src/domain/conversation/ConversationManager.ts` - State machine

## Documentation Files
- `README-NEW.md` - Main documentation
- `SETUP-INSTRUCTIONS.md` - Setup guide
- `MODERNIZATION-SUMMARY.md` - What changed
- `docs/MIGRATION.md` - Migration details
- `docs/deploy.md` - Deployment guide

## NPM Scripts

### Backend
```bash
npm run dev             # Development mode
npm run build           # Build for production
npm run start           # Run production
npm run lint            # Lint code
npm run test            # Run tests
npm run prisma:generate # Generate Prisma
npm run prisma:migrate  # Run migrations
```

### Frontend
```bash
npm run dev             # Development mode
npm run build           # Build for production
npm run start           # Run production build
npm run lint            # Lint code
```

## Quick Debug Commands
```bash
# Check what's running
docker compose ps

# Check logs
docker compose logs -f

# Check environment
docker compose exec api env | grep LIVEKIT
docker compose exec frontend env | grep NEXT

# Restart everything
docker compose restart

# Nuclear option (clean start)
docker compose down -v
docker compose up -d --build
```

## Production Checklist
- [ ] Update .env with production values
- [ ] Set strong database password
- [ ] Enable HTTPS
- [ ] Set CORS to specific domain
- [ ] Set up database backups
- [ ] Configure monitoring
- [ ] Test all provider APIs
- [ ] Run `npm run build` for all services
- [ ] Deploy with `docker compose -f docker-compose.prod.yml up -d`

---

**Keep this card handy! 📌**
