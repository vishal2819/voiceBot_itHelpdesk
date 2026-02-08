# Deployment Guide

## Render Deployment

### 1. Prerequisites

- GitHub account with repo pushed
- Render account (free tier available)
- Database and API keys ready

### 2. Database Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Name: `voicebot-db`
4. Select free tier
5. Click "Create Database"
6. Copy the "External Database URL"

### 3. Backend Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `voicebot-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`
   - **Plan**: Free

4. Add Environment Variables:

   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=[from step 2]
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_key
   LIVEKIT_API_SECRET=your_secret
   STT_PROVIDER=deepgram
   DEEPGRAM_API_KEY=your_key
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your_key
   TTS_PROVIDER=openai
   OPENAI_API_KEY=your_key
   OPENAI_TTS_VOICE=alloy
   ```

   Local provider options (free):

   ```
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://ollama:11434
   OLLAMA_MODEL=llama3.1

   STT_PROVIDER=whispercpp
   WHISPER_BASE_URL=http://whispercpp:8080
   WHISPER_API_STYLE=whispercpp
   WHISPER_MODEL=base

   TTS_PROVIDER=piper
   PIPER_BASE_URL=http://piper:5002
   PIPER_VOICE=en_US-lessac
   PIPER_AUDIO_FORMAT=wav
   ```

5. Click "Create Web Service"

### 4. LiveKit Cloud Setup

1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Sign up (free tier: 1000 minutes/month)
3. Create a project
4. Copy API Key and Secret
5. Update LIVEKIT_URL in Render environment variables

### 5. Static Site for Web Client

1. In Render, click "New +" → "Static Site"
2. Connect repository
3. Configure:
   - **Name**: `voicebot-webapp`
   - **Build Command**: `echo "No build needed"`
   - **Publish Directory**: `web`

4. Update `web/client.js` with your backend URL:

   ```javascript
   const API_URL = 'https://voicebot-backend.onrender.com';
   ```

## Railway Deployment (Alternative)

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Deploy

```bash
railway login
railway init
railway add postgres
railway up
```

### 3. Set Environment Variables

Use Railway dashboard to add the same environment variables as Render.

## Free Tier Limits

### LiveKit Cloud

- 1,000 minutes/month free
- ~16 hours of usage

### Deepgram

- $200 free credit
- ~4,600 hours at Nova-2 pricing

### Anthropic (Claude Haiku)

- Pay-as-you-go
- ~$0.25 per million input tokens
- Very cost-effective for this use case

### OpenAI TTS

- Pay-as-you-go
- ~$0.015 per 1,000 characters
- Affordable for moderate usage

### Render/Railway

- Free tier includes:
  - 750 hours/month
  - Auto-sleep after 15 min inactivity
  - 512 MB RAM

## Cost Optimization Tips

1. **Enable cost tracking** in `.env`:

   ```
   COST_TRACKING_ENABLED=true
   ```

2. **Monitor usage** via logs:

   ```bash
   # Check cost report endpoint
   GET /api/usage
   ```

3. **Set usage alerts** in provider dashboards

4. **Use conversation logs** for debugging instead of repeated testing

## Health Monitoring

Your service exposes a health endpoint:

```
GET https://your-app.onrender.com/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2026-02-07T...",
  "services": {
    "database": "connected",
    "stt": "deepgram",
    "llm": "anthropic",
    "tts": "openai"
  }
}
```

## Troubleshooting

### Database Connection Issues

- Verify DATABASE_URL is correctly formatted
- Check if Render database is active
- Run migrations manually: `npx prisma migrate deploy`

### LiveKit Connection Fails

- Verify LIVEKIT_URL format: `wss://...`
- Check API key and secret are correct
- Ensure firewall allows WebSocket connections

### Build Failures

- Clear build cache in Render
- Check Node version (should be 20+)
- Verify all dependencies in package.json

## Logs

View logs in real-time:

```bash
# Render
render logs -s voicebot-backend

# Railway
railway logs
```
