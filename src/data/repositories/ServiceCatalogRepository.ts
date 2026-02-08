import { ServiceCatalog } from '@prisma/client';

import { logger } from '../../utils/logger.js';
import { getPrismaClient } from '../db.js';
import { NotFoundError } from '../errors.js';

export class ServiceCatalogRepository {
  private prisma = getPrismaClient();

  /**
   * Get all active services
   */
  async getAllServices(): Promise<ServiceCatalog[]> {
    return this.prisma.serviceCatalog.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Get service by issue type
   */
  async getServiceByIssueType(issueType: string): Promise<ServiceCatalog> {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { issueType },
    });

    if (!service) {
      throw new NotFoundError('ServiceCatalog', issueType);
    }

    return service;
  }

  /**
   * Search services by keywords (for classification logic)
   */
  async searchByKeywords(keywords: string[]): Promise<ServiceCatalog[]> {
    const services = await this.prisma.serviceCatalog.findMany({
      where: {
        isActive: true,
        keywords: {
          hasSome: keywords,
        },
      },
    });

    logger.debug({ keywords, foundServices: services.length }, 'keyword search completed');
    return services;
  }

  /**
   * Get price for issue type
   */
  async getPriceForIssue(issueType: string): Promise<number> {
    const service = await this.getServiceByIssueType(issueType);
    return Number(service.price);
  }
}
