/**
 * Manual Bot Runner
 * This script runs ON THE HOST machine, so it needs to talk to Docker containers via localhost.
 * We override the environment variables programmatically before loading the app.
 */

// 1. Force Localhost Networking for this script only
process.env.PIPER_BASE_URL = 'http://127.0.0.1:5002';
process.env.WHISPER_BASE_URL = 'http://127.0.0.1:8080';
process.env.WHISPER_API_STYLE = 'onerahmet'; // Fix 404 error by matching image API
process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

// 2. Dynamic imports to ensure env vars are set BEFORE config loads
const { AccessToken } = await import('livekit-server-sdk');
const { VoiceAgent } = await import('./agents/VoiceAgent.js');
const { loadEnv } = await import('./config/env.js');
const { logger } = await import('./utils/logger.js');

const config = loadEnv();
const ROOM_NAME = 'demo-room';
const AGENT_IDENTITY = 'voice_agent_bot';

async function main() {
  logger.info('Starting manual Voice Bot runner (Host Mode)...');

  // 1. Create a token for the agent
  const at = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
    identity: AGENT_IDENTITY,
    name: 'Help Desk Bot',
    ttl: '1h',
  });

  at.addGrant({
    room: ROOM_NAME,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  
  logger.info({ room: ROOM_NAME, identity: AGENT_IDENTITY }, 'Agent token generated');

  // 2. Instantiate and connect the agent
  const agent = new VoiceAgent(ROOM_NAME, AGENT_IDENTITY);
  
  try {
    await agent.connect(token);
    logger.info('Bot connected successfully! Waiting for user...');
    
    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect bot');
    process.exit(1);
  }
}

main().catch(console.error);
