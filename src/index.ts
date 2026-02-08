import { startAgentServer } from './agents/server.js';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';

const config = loadEnv();

logger.info({ env: config.NODE_ENV }, 'IT Help Desk Voice Bot starting');

// Start the agent server
startAgentServer()
  .then(() => {
    logger.info('=== Voice Bot Ready ===');
    logger.info('Open web/index.html in your browser to start a voice conversation');
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Failed to start agent server');
    process.exit(1);
  });

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'uncaught exception');
  process.exit(1);
});
