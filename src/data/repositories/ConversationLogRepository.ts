import { ConversationLog, Prisma } from '@prisma/client';

import { logger } from '../../utils/logger.js';
import { getPrismaClient } from '../db.js';

export interface CreateConversationLogInput {
  ticketId?: string;
  sessionId: string;
  conversationState: string;
  userMessage?: string;
  botResponse?: string;
  toolCalls?: Prisma.JsonValue;
  metadata?: Prisma.JsonValue;
}

export class ConversationLogRepository {
  private prisma = getPrismaClient();

  /**
   * Log a conversation turn
   */
  async createLog(input: CreateConversationLogInput): Promise<ConversationLog> {
    try {
      const log = await this.prisma.conversationLog.create({
        data: {
          ticketId: input.ticketId ?? null,
          sessionId: input.sessionId,
          conversationState: input.conversationState,
          userMessage: input.userMessage ?? null,
          botResponse: input.botResponse ?? null,
          toolCalls: input.toolCalls as never,
          metadata: input.metadata as never,
        },
      });

      logger.debug(
        { logId: log.id, sessionId: log.sessionId, state: log.conversationState },
        'conversation logged',
      );
      return log;
    } catch (error) {
      logger.error({ err: error, sessionId: input.sessionId }, 'failed to create conversation log');
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  async getSessionLogs(sessionId: string): Promise<ConversationLog[]> {
    return this.prisma.conversationLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get conversation logs for a ticket
   */
  async getTicketLogs(ticketId: string): Promise<ConversationLog[]> {
    return this.prisma.conversationLog.findMany({
      where: { ticketId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Clean up old logs (for maintenance)
   */
  async deleteOldLogs(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.conversationLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info({ deleted: result.count, olderThanDays }, 'cleaned up old conversation logs');
    return result.count;
  }
}
