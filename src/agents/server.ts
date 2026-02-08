import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

import { loadEnv } from '../config/env.js';
import { getPrismaClient } from '../data/db.js';
import { logger } from '../utils/logger.js';

const config = loadEnv();
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  // Log all requests
  logger.info({ method: req.method, path: req.path, body: req.body }, 'incoming request');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await getPrismaClient().$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        stt: config.STT_PROVIDER,
        llm: config.LLM_PROVIDER,
        tts: config.TTS_PROVIDER,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'health check failed');
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
    });
  }
});

/**
 * Generate LiveKit token for client
 * Note: Agent dispatch is now handled by LiveKit Cloud or separate agent service
 */
app.post('/token', async (req, res) => {
  const { participantName } = req.body;

  if (!participantName) {
    return res.status(400).json({ error: 'participantName required' });
  }

  try {
    // Generate unique identifiers
    const participantIdentity = `helpdesk_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `helpdesk_room_${Math.floor(Math.random() * 10_000)}`;

    // Create access token
    const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: '15m',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // Return connection details including serverUrl
    res.json({
      serverUrl: config.LIVEKIT_URL,
      roomName,
      participantName,
      participantToken: token,
    });
  } catch (error) {
    logger.error({ err: error }, 'failed to generate token');
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * Webhook endpoint for LiveKit events
 */
app.post('/webhook/livekit', (req, res) => {
  logger.info({ event: req.body }, 'livekit webhook received');
  // Handle LiveKit events (participant joined, left, etc.)
  res.sendStatus(200);
});

/**
 * Start agent server
 */
export async function startAgentServer(): Promise<void> {
  const port = config.PORT;

  app.listen(port, () => {
    logger.info({ port, env: config.NODE_ENV }, 'agent server started');
    logger.info(`Health check: http://localhost:${port}/health`);
    logger.info(`Token endpoint: http://localhost:${port}/token`);
  });
}
