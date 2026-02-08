# Setup Instructions - Modernized VoiceBot IT Helpdesk

## 📋 Overview

Your project has been modernized with:
- ✅ Next.js 15 + React 19 frontend
- ✅ @livekit/components-react integration
- ✅ Microservices architecture (API, Frontend, Agent)
- ✅ Improved error handling and state visualization
- ✅ Production-ready Docker configuration

## 🗂️ New Structure

```
voiceBot_itHelpdesk/
├── frontend/           # NEW: Next.js application (Port 3002)
├── agent-service/      # NEW: Standalone agent service
├── src/               # UPDATED: Simplified API server (Port 3001)
├── prisma/            # Unchanged: Database schema
├── docs/              # NEW: Comprehensive docs
│   ├── MIGRATION.md
│   └── deploy.md
└── docker-compose.yml # UPDATED: Multi-service setup
```

## 🚀 Getting Started

### Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 2: Install Agent Service Dependencies

```bash
cd agent-service
npm install
cd ..
```

### Step 3: Create Environment Files

**frontend/.env.local** (create this file):
```env
LIVEKIT_URL=wss://ithelpdeskvoicebot-zzcw9hbw.livekit.cloud
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Copy your existing `.env` values to the frontend.

### Step 4: Start Services

**Option A: Docker (Recommended)**
```powershell
docker compose down  # Stop old containers
docker compose up -d --build  # Start new architecture
```

**Option B: Local Development (3 terminals)**

Terminal 1 - API Server:
```powershell
npm run dev
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

Terminal 3 - Agent (Optional for now):
```powershell
cd agent-service
npm run dev
```

### Step 5: Access the Application

- **NEW Frontend**: http://localhost:3002
- **Old Frontend**: Still available at old location for reference
- **API Health**: http://localhost:3001/health

## 🎯 What Changed?

### Frontend (Port 3002)
- Modern React components
- Real-time state visualization
- Improved error handling
- Better UX with loading states

### Backend (Port 3001)
- Simplified to API-only server
- No longer manages agents directly
- Returns serverUrl in token response

### Agent Service
- Runs independently
- Can be scaled separately
- Better lifecycle management

## 🔧 Testing the New Setup

1. **Open http://localhost:3002**
2. Enter your name
3. Click "Start Voice Call"
4. Verify microphone access
5. Check real-time state indicators (listening/thinking/speaking)
6. Test voice conversation

## 📊 Monitoring

```powershell
# View all service logs
docker compose logs -f

# View specific service
docker compose logs -f frontend
docker compose logs -f api
docker compose logs -f agent

# Check service status
docker compose ps
```

## 🐛 Troubleshooting

### Frontend not loading
```powershell
cd frontend
npm install
npm run dev
```

### API token errors
Check that `.env` has correct LiveKit credentials:
```powershell
# In root directory
Get-Content .env | Select-String LIVEKIT
```

### Agent not connecting
```powershell
docker compose logs agent
# Check for connection errors
```

### Port conflicts
If ports are in use:
```powershell
# Check what's using port 3002
netstat -ano | findstr :3002

# Or change ports in docker-compose.yml and frontend/package.json
```

## 🎨 Customization

### Update Branding
Edit `frontend/components/VoiceBotApp.tsx`:
- Change title: "IT Help Desk Voice Bot"
- Update services displayed
- Modify color scheme in Tailwind classes

### Update Services
Edit `frontend/components/VoiceBotApp.tsx` ServiceItem components:
```typescript
<ServiceItem icon="📶" name="Wi-Fi Issues" price="$20" />
```

### Change Ports
- Frontend: `frontend/package.json` → `"dev": "next dev -p 3002"`
- API: `src/config/env.ts` → `PORT: z.coerce.number().default(3000)`

## 📚 Next Steps

1. ✅ Test the new frontend interface
2. ✅ Verify voice conversation works
3. ✅ Check state visualizations
4. ✅ Review error handling
5. 🔄 Deploy to production (see docs/deploy.md)
6. 🔄 Customize branding and services
7. 🔄 Set up monitoring and alerts

## 📖 Documentation

- **README-NEW.md** - Comprehensive project overview
- **docs/MIGRATION.md** - Detailed migration guide
- **docs/deploy.md** - Production deployment guide
- **docs/database-setup.md** - Database configuration

## 💡 Key Improvements

### Developer Experience
- Hot reload for frontend changes
- Separate services for parallel development
- Better error messages
- TypeScript throughout

### User Experience
- Modern UI with Tailwind CSS
- Real-time visual feedback
- Smoother transitions
- Better error handling

### Production Ready
- Docker multi-stage builds
- Separate scalable services
- Health checks
- Logging and monitoring

## 🆘 Getting Help

If you encounter issues:

1. Check terminal for error messages
2. View Docker logs: `docker compose logs -f`
3. Verify environment variables
4. Test each service independently
5. Review docs/MIGRATION.md for breaking changes

## 🎯 Quick Commands Reference

```powershell
# Start everything
docker compose up -d --build

# Stop everything
docker compose down

# Rebuild after changes
docker compose up -d --build --force-recreate

# View logs
docker compose logs -f

# Restart single service
docker compose restart frontend

# Check service health
curl http://localhost:3001/health

# Install dependencies
npm install                    # Backend
cd frontend && npm install     # Frontend
cd agent-service && npm install  # Agent
```

## ✅ Verification Checklist

- [ ] Frontend opens at http://localhost:3002
- [ ] API health check works at http://localhost:3001/health
- [ ] Can enter name and start call
- [ ] Microphone permission granted
- [ ] Voice conversation works
- [ ] State indicators show (listening/thinking/speaking)
- [ ] Transcript displays messages
- [ ] Tickets can be created
- [ ] All Docker services running

---

**You're all set!** 🎉

Your voicebot is now modernized with the latest LiveKit patterns and React best practices.
