import { Prisma, Ticket, TicketStatus } from '@prisma/client';

import { logger } from '../../utils/logger.js';
import { getPrismaClient } from '../db.js';
import { NotFoundError, OptimisticLockError, ValidationError } from '../errors.js';

export interface CreateTicketInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  issue: string;
  issueType?: string;
  price: number;
}

export interface UpdateTicketInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  issue?: string;
  issueType?: string;
  price?: number;
  status?: TicketStatus;
}

export interface TicketFilters {
  status?: TicketStatus;
  email?: string;
  issueType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export class TicketRepository {
  private prisma = getPrismaClient();

  /**
   * Create a new ticket with automatic ticket number generation
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    try {
      const ticket = await this.prisma.ticket.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          issue: input.issue,
          issueType: input.issueType ?? null,
          price: input.price,
          status: 'CREATED',
        },
      });

      logger.info({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber }, 'ticket created');
      return ticket;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ValidationError('Duplicate ticket detected', undefined, error);
        }
      }
      logger.error({ err: error }, 'failed to create ticket');
      throw error;
    }
  }

  /**
   * Update ticket with optimistic locking
   */
  async updateTicket(id: string, version: number, input: UpdateTicketInput): Promise<Ticket> {
    try {
      const ticket = await this.prisma.ticket.update({
        where: {
          id,
          version, // Optimistic lock: only update if version matches
        },
        data: {
          ...input,
          version: { increment: 1 },
        },
      });

      logger.info({ ticketId: ticket.id, newVersion: ticket.version }, 'ticket updated');
      return ticket;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new OptimisticLockError('Ticket', id, error);
        }
      }
      logger.error({ err: error, ticketId: id }, 'failed to update ticket');
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicketById(id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundError('Ticket', id);
    }
    return ticket;
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { ticketNumber } });
    if (!ticket) {
      throw new NotFoundError('Ticket', ticketNumber);
    }
    return ticket;
  }

  /**
   * List tickets with filters and pagination
   */
  async listTickets(
    filters?: TicketFilters,
    pagination?: PaginationOptions,
  ): Promise<{ tickets: Ticket[]; total: number }> {
    const where: Prisma.TicketWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.email) {
      where.email = filters.email;
    }
    if (filters?.issueType) {
      where.issueType = filters.issueType;
    }
    if (filters?.createdAfter || filters?.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip: pagination?.skip ?? undefined,
        take: pagination?.take ?? undefined,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { tickets, total };
  }

  /**
   * Get ticket statistics for monitoring
   */
  async getTicketStats(): Promise<{
    total: number;
    byStatus: Record<TicketStatus, number>;
    avgResolutionTime?: number;
  }> {
    const [total, byStatus] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const statusMap = byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<TicketStatus, number>,
    );

    return {
      total,
      byStatus: statusMap,
    };
  }
}
