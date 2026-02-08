import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  base: undefined,
  messageKey: 'message',
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});
