import { logger } from '../../utils/logger.js';
import { LLMResult } from './types.js';

/**
 * LLM Error Types
 */
export enum LLMErrorType {
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',
  AUTH_ERROR = 'auth_error',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN = 'unknown',
}

/**
 * Custom LLM Error with type classification
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly type: LLMErrorType,
    public readonly retryable: boolean,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'LLMError';
  }

  static fromError(error: unknown): LLMError {
    if (error instanceof LLMError) return error;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';

    // Classify error type
    if (errorMessage.includes('timeout') || errorName.includes('Timeout')) {
      return new LLMError('LLM request timed out', LLMErrorType.TIMEOUT, true, error as Error);
    }
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return new LLMError('Rate limit exceeded', LLMErrorType.RATE_LIMIT, true, error as Error);
    }
    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      return new LLMError('API quota exceeded', LLMErrorType.QUOTA_EXCEEDED, false, error as Error);
    }
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('authentication')) {
      return new LLMError('Authentication failed', LLMErrorType.AUTH_ERROR, false, error as Error);
    }
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return new LLMError('Server error', LLMErrorType.SERVER_ERROR, true, error as Error);
    }
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
      return new LLMError('Network error', LLMErrorType.NETWORK_ERROR, true, error as Error);
    }

    return new LLMError(errorMessage, LLMErrorType.UNKNOWN, true, error as Error);
  }
}

/**
 * Circuit Breaker State
 */
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit Breaker Pattern for LLM calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly failureThreshold = 3,
    private readonly resetTimeout = 30000, // 30 seconds
    private readonly halfOpenSuccessThreshold = 2,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        logger.info('circuit breaker transitioning to half-open');
      } else {
        throw new LLMError('Circuit breaker is open', LLMErrorType.SERVER_ERROR, false);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        logger.info('circuit breaker closed after successful recovery');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn({ failureCount: this.failureCount }, 'circuit breaker opened');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute with retry and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: LLMError | null = null;
  let delay = config.baseDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = LLMError.fromError(error);

      if (!lastError.retryable || attempt >= config.maxRetries) {
        logger.error(
          { attempt, type: lastError.type, message: lastError.message },
          'LLM request failed (not retrying)',
        );
        throw lastError;
      }

      logger.warn(
        { attempt, type: lastError.type, nextDelay: delay },
        'LLM request failed, retrying',
      );

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
    }
  }

  throw lastError || new LLMError('Max retries exceeded', LLMErrorType.UNKNOWN, false);
}

/**
 * Add timeout to a promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LLMError(`Request timed out after ${timeoutMs}ms`, LLMErrorType.TIMEOUT, true));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fallback responses for when LLM completely fails
 */
export const FALLBACK_RESPONSES: Record<string, string> = {
  default: "I'm sorry, I'm having trouble processing your request right now. Could you please try again in a moment?",
  greeting: "Hello! I'm here to help you with IT support. Please tell me your name to get started.",
  name_collection: "Thank you. Could you please provide your email address?",
  email_collection: "Got it. What's the best phone number to reach you?",
  phone_collection: "Thanks. And what's your address?",
  address_collection: "Perfect. Now, please describe the issue you're experiencing.",
  issue_collection: "Let me review the details. Please confirm if everything looks correct.",
  confirmation: "Your ticket has been created. Is there anything else I can help you with?",
  error: "I apologize for the inconvenience. Our system is experiencing issues. Please try again shortly.",
};

/**
 * Get fallback response based on conversation state
 */
export function getFallbackResponse(state?: string): string {
  if (state && FALLBACK_RESPONSES[state]) {
    return FALLBACK_RESPONSES[state];
  }
  return FALLBACK_RESPONSES.default;
}

/**
 * Create a fallback LLM result
 */
export function createFallbackResult(content: string): LLMResult {
  return {
    content,
    finishReason: 'stop',
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    },
    metadata: {
      fallback: true,
      provider: 'fallback',
    },
  };
}
