/**
 * Manual Bot Runner
 * This script runs ON THE HOST machine, connecting to LiveKit Cloud.
 * It uses cloud providers (Deepgram, Anthropic, OpenAI) configured via .env
 */

// Dynamic imports
const { AccessToken } = await import('livekit-server-sdk');
const { VoiceAgent } = await import('./agents/VoiceAgent.js');
const { loadEnv } = await import('./config/env.js');
const { logger } = await import('./utils/logger.js');

const config = loadEnv();

// Allow room name from command line: npx tsx src/run-bot.ts my-room-name
const ROOM_NAME = process.argv[2] || 'demo-room';
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
