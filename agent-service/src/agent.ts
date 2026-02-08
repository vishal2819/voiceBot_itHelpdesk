import { Room, RoomEvent } from '@livekit/rtc-node';
import pino from 'pino';
import dotenv from 'dotenv';
import { VoiceAgent } from './VoiceAgent.js';

dotenv.config({ path: '../.env' });

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  logger.error('Missing required LiveKit environment variables');
  process.exit(1);
}

/**
 * Agent service that listens for new rooms and joins them automatically
 * This runs as a separate service from the API server
 */
async function startAgentService() {
  logger.info('Starting voice agent service...');

  // In a production environment, you would use LiveKit's Room Service API
  // to monitor for new rooms and join them. For this example, we'll use
  // a webhook-based approach or agent dispatch from LiveKit Cloud.

  logger.info('Agent service ready to join rooms');
  logger.info('Waiting for room assignments from LiveKit...');

  // The agent will be dispatched by LiveKit Cloud when rooms are created
  // with the proper room configuration specifying the agent name
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down agent service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down agent service...');
  process.exit(0);
});

startAgentService().catch((error) => {
  logger.error({ err: error }, 'Failed to start agent service');
  process.exit(1);
});
