import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger.js';
import {
  ConversationContext,
  ConversationState,
  getMissingFields,
  getNextState,
  isDataComplete,
  isValidTransition,
} from './state.js';

/**
 * Conversation manager handles state transitions and context updates
 */
export class ConversationManager {
  private context: ConversationContext;

  constructor(sessionId?: string) {
    this.context = {
      state: ConversationState.GREETING,
      sessionId: sessionId ?? uuidv4(),
      retryCount: 0,
      metadata: {
        startedAt: new Date(),
        lastUpdatedAt: new Date(),
        turnCount: 0,
      },
    };

    logger.info({ sessionId: this.context.sessionId }, 'conversation started');
  }

  /**
   * Get current context
   */
  getContext(): Readonly<ConversationContext> {
    return { ...this.context };
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.context.state;
  }

  /**
   * Transition to a new state with validation
   */
  transitionTo(newState: ConversationState): void {
    if (!isValidTransition(this.context.state, newState)) {
      logger.warn({ from: this.context.state, to: newState }, 'invalid state transition attempted');
      throw new Error(`Invalid transition from ${this.context.state} to ${newState}`);
    }

    const previousState = this.context.state;
    this.context.state = newState;
    this.context.metadata.lastUpdatedAt = new Date();
    this.context.metadata.turnCount++;

    logger.info(
      { sessionId: this.context.sessionId, from: previousState, to: newState },
      'state transition',
    );
  }

  /**
   * Advance to next state in happy path
   */
  advanceToNextState(): void {
    const nextState = getNextState(this.context.state);
    if (nextState) {
      this.transitionTo(nextState);
    } else {
      logger.warn({ currentState: this.context.state }, 'no next state available');
    }
  }

  /**
   * Update context field
   */
  updateField(field: keyof ConversationContext, value: unknown): void {
    (this.context as unknown as Record<string, unknown>)[field] = value;
    this.context.metadata.lastUpdatedAt = new Date();

    logger.debug(
      { sessionId: this.context.sessionId, field, hasValue: !!value },
      'context field updated',
    );
  }

  /**
   * Update multiple fields at once
   */
  updateFields(updates: Partial<ConversationContext>): void {
    Object.assign(this.context, updates);
    this.context.metadata.lastUpdatedAt = new Date();

    logger.debug(
      { sessionId: this.context.sessionId, fields: Object.keys(updates) },
      'context fields updated',
    );
  }

  /**
   * Check if all required data is collected
   */
  isComplete(): boolean {
    return isDataComplete(this.context);
  }

  /**
   * Get missing required fields
   */
  getMissingFields(): string[] {
    return getMissingFields(this.context);
  }

  /**
   * Increment retry counter
   */
  incrementRetry(): void {
    this.context.retryCount++;
    logger.debug(
      { sessionId: this.context.sessionId, retryCount: this.context.retryCount },
      'retry count incremented',
    );
  }

  /**
   * Reset retry counter
   */
  resetRetry(): void {
    this.context.retryCount = 0;
  }

  /**
   * Set error and transition to error recovery
   */
  handleError(error: string): void {
    this.context.lastError = error;
    this.transitionTo(ConversationState.ERROR_RECOVERY);

    logger.warn({ sessionId: this.context.sessionId, error }, 'conversation error');
  }

  /**
   * End the conversation
   */
  end(): void {
    this.transitionTo(ConversationState.ENDED);
    logger.info(
      { sessionId: this.context.sessionId, turnCount: this.context.metadata.turnCount },
      'conversation ended',
    );
  }

  /**
   * Get conversation duration in seconds
   */
  getDuration(): number {
    const now = new Date();
    return Math.floor((now.getTime() - this.context.metadata.startedAt.getTime()) / 1000);
  }

  /**
   * Export context for persistence/logging
   */
  toJSON(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Restore context from JSON
   */
  static fromJSON(json: ConversationContext): ConversationManager {
    const manager = new ConversationManager(json.sessionId);
    manager.context = {
      ...json,
      metadata: {
        ...json.metadata,
        startedAt: new Date(json.metadata.startedAt),
        lastUpdatedAt: new Date(json.metadata.lastUpdatedAt),
      },
    };
    return manager;
  }
}
