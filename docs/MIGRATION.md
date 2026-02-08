# Migration Guide: Old Architecture to New

This document explains the changes from the old architecture to the new modernized architecture.

## Major Changes

### 1. Frontend Architecture

**Old:**
- Vanilla HTML/CSS/JS
- Direct LiveKit client usage
- Hardcoded LiveKit URL
- Manual audio handling

**New:**
- Next.js 15 with React 19
- @livekit/components-react
- Dynamic server URL from API
- Built-in audio components

### 2. Backend Architecture

**Old:**
```
Single Express Server
├── API endpoints
├── Agent management
├── LiveKit connection
└── Token generation
```

**New:**
```
Microservices Architecture
├── API Server (Express)
│   └── Token generation only
├── Agent Service (Separate)
│   └── Voice agent runtime
└── Frontend (Next.js)
    └── UI and LiveKit integration
```

### 3. Agent Lifecycle

**Old:**
- Agent created when user requests token
- Manual agent-to-room connection
- 30-minute timeout cleanup
- Tight coupling with API server

**New:**
- Agent runs as separate service
- LiveKit Cloud agent dispatch
- Automatic lifecycle management
- Decoupled from API server

## Migration Steps

### Step 1: Update Frontend

1. Navigate to old `web/` directory
2. All files replaced by `frontend/` directory
3. New routing: http://localhost:3002 (was 3001)

### Step 2: Update Backend

The backend API server has been simplified:

**Old `src/agents/server.ts`:**
```typescript
// Managed agents directly
const activeAgents = new Map<string, VoiceAgent>();

// Created agent on token request
if (!activeAgents.has(roomName)) {
  const agent = new VoiceAgent(roomName, 'assistant');
  agent.connect(agentToken);
  activeAgents.set(roomName, agent);
}
```

**New `src/agents/server.ts`:**
```typescript
// Just generates tokens
// Agent dispatch handled by LiveKit Cloud
const token = await at.toJwt();
res.json({
  serverUrl: config.LIVEKIT_URL,
  roomName,
  participantToken: token,
});
```

### Step 3: Agent Service

New standalone service in `agent-service/`:

```
agent-service/
├── src/
│   ├── agent.ts       # Entry point
│   └── VoiceAgent.ts  # Agent logic
├── package.json
└── Dockerfile
```

### Step 4: Docker Configuration

**Old:**
```yaml
services:
  app:  # Single service
    build: .
    ports:
      - '3001:3000'
```

**New:**
```yaml
services:
  api:       # API server
    ports:
      - '3001:3000'
  
  frontend:  # Next.js frontend
    ports:
      - '3002:3002'
  
  agent:     # Separate agent service
    build: ./agent-service
```

## Breaking Changes

### 1. Port Changes
- Frontend: 3001 → 3002
- Backend API: Still 3001 (but just API now)
- Agent: No exposed port (background service)

### 2. Environment Variables

**Added:**
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Changed:**
```env
# No longer needs AGENT_NAME in backend
# Agents run separately
```

### 3. Client Connection

**Old:**
```javascript
const LIVEKIT_URL = 'wss://hardcoded.livekit.cloud';

fetch(`${API_URL}/token`, {
  body: JSON.stringify({ roomName, participantName })
});
```

**New:**
```typescript
const response = await fetch('/api/connection-details', {
  body: JSON.stringify({ participantName })
});

const { serverUrl, participantToken } = await response.json();

<LiveKitRoom
  serverUrl={serverUrl}
  token={participantToken}
/>
```

## Feature Comparison

| Feature | Old | New |
|---------|-----|-----|
| Frontend | Vanilla JS | Next.js + React |
| UI Components | Manual | @livekit/components-react |
| Agent Management | Manual | LiveKit Dispatch |
| Architecture | Monolithic | Microservices |
| State Visualization | Basic | Real-time |
| Error Handling | Basic | Comprehensive |
| TypeScript | Partial | Full |
| Hot Reload | No | Yes |
| Production Ready | Basic | Advanced |

## Rollback Plan

If you need to rollback to the old architecture:

1. Checkout previous commit:
```bash
git log --oneline  # Find commit before migration
git checkout <commit-hash>
```

2. Or keep old files in `web/` and continue using:
```bash
# Keep using old web client
open web/index.html
```

3. Revert docker-compose.yml to single service

## Next Steps

1. Test new architecture locally
2. Update environment variables for production
3. Deploy frontend to Vercel
4. Deploy backend to your cloud provider
5. Monitor agent service logs
6. Update documentation links

## Support

For issues during migration:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Test each service independently
4. Review error messages in browser console
