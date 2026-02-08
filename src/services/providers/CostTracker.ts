import { logger } from '../../utils/logger.js';

export interface UsageMetrics {
  sttDuration: number; // in seconds
  llmTokens: number;
  ttsDuration: number; // in seconds
  timestamp: Date;
}

export interface CostEstimate {
  sttCost: number;
  llmCost: number;
  ttsCost: number;
  totalCost: number;
}

/**
 * Cost tracking and usage monitoring for API providers
 * Helps stay within free tier limits
 */
export class CostTracker {
  private usageHistory: UsageMetrics[] = [];
  private enabled: boolean;

  // Approximate pricing (as of 2026, USD)
  private readonly pricing = {
    deepgram: {
      perMinute: 0.0043, // $0.0043 per minute
    },
    anthropic: {
      haiku: {
        inputPer1M: 0.25, // $0.25 per 1M input tokens
        outputPer1M: 1.25, // $1.25 per 1M output tokens
      },
    },
    openai: {
      tts: {
        perCharacter: 0.000015, // $0.015 per 1K characters
      },
    },
  };

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * Track usage for a conversation turn
   */
  track(metrics: UsageMetrics): void {
    if (!this.enabled) return;

    this.usageHistory.push(metrics);

    const estimate = this.calculateCost(metrics);

    logger.info(
      {
        sttDuration: metrics.sttDuration,
        llmTokens: metrics.llmTokens,
        ttsDuration: metrics.ttsDuration,
        estimatedCost: estimate.totalCost.toFixed(6),
      },
      'usage tracked',
    );

    // Warn if approaching typical free tier limits
    const totalUsage = this.getTotalUsage();
    if (totalUsage.llmTokens > 900000) {
      // Approaching 1M token limit
      logger.warn({ totalTokens: totalUsage.llmTokens }, 'approaching token limit');
    }
  }

  /**
   * Calculate cost for specific metrics
   */
  calculateCost(metrics: UsageMetrics): CostEstimate {
    const sttCost = (metrics.sttDuration / 60) * this.pricing.deepgram.perMinute;

    const llmCost =
      (metrics.llmTokens / 1000000) *
      (this.pricing.anthropic.haiku.inputPer1M + this.pricing.anthropic.haiku.outputPer1M);

    const ttsCharacters = metrics.ttsDuration * 50; // Rough estimate
    const ttsCost = ttsCharacters * this.pricing.openai.tts.perCharacter;

    return {
      sttCost,
      llmCost,
      ttsCost,
      totalCost: sttCost + llmCost + ttsCost,
    };
  }

  /**
   * Get total usage across all tracked sessions
   */
  getTotalUsage(): {
    sttDuration: number;
    llmTokens: number;
    ttsDuration: number;
    estimatedCost: CostEstimate;
  } {
    const totals = this.usageHistory.reduce(
      (acc, m) => ({
        sttDuration: acc.sttDuration + m.sttDuration,
        llmTokens: acc.llmTokens + m.llmTokens,
        ttsDuration: acc.ttsDuration + m.ttsDuration,
      }),
      { sttDuration: 0, llmTokens: 0, ttsDuration: 0 },
    );

    const estimatedCost = this.calculateCost({ ...totals, timestamp: new Date() });

    return {
      ...totals,
      estimatedCost,
    };
  }

  /**
   * Get usage report
   */
  getReport() {
    const totalUsage = this.getTotalUsage();
    const sessionCount = this.usageHistory.length;

    return {
      sessionCount,
      totalUsage,
      avgCostPerSession: sessionCount > 0 ? totalUsage.estimatedCost.totalCost / sessionCount : 0,
    };
  }

  /**
   * Reset tracking history
   */
  reset(): void {
    this.usageHistory = [];
    logger.info('usage history reset');
  }
}

// Singleton instance
export const costTracker = new CostTracker(process.env.COST_TRACKING_ENABLED === 'true');
