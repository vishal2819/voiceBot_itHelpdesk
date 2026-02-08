/**
 * Conversation state machine for IT help desk bot
 * Explicit states to avoid relying purely on LLM for flow control
 */

export enum ConversationState {
  GREETING = 'GREETING',
  COLLECTING_NAME = 'COLLECTING_NAME',
  COLLECTING_EMAIL = 'COLLECTING_EMAIL',
  COLLECTING_PHONE = 'COLLECTING_PHONE',
  COLLECTING_ADDRESS = 'COLLECTING_ADDRESS',
  COLLECTING_ISSUE = 'COLLECTING_ISSUE',
  CONFIRMING_DETAILS = 'CONFIRMING_DETAILS',
  TICKET_CREATION = 'TICKET_CREATION',
  CONFIRMATION = 'CONFIRMATION',
  ERROR_RECOVERY = 'ERROR_RECOVERY',
  ENDED = 'ENDED',
}

export interface ConversationContext {
  state: ConversationState;
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  issue?: string;
  issueType?: string;
  price?: number;
  ticketId?: string;
  ticketNumber?: string;
  retryCount: number;
  lastError?: string;
  metadata: {
    startedAt: Date;
    lastUpdatedAt: Date;
    turnCount: number;
  };
}

/**
 * State transition rules
 */
export const validTransitions: Record<ConversationState, ConversationState[]> = {
  [ConversationState.GREETING]: [
    ConversationState.COLLECTING_NAME,
    ConversationState.COLLECTING_EMAIL, // Allow jumping if user provides info upfront
    ConversationState.ERROR_RECOVERY,
  ],
  [ConversationState.COLLECTING_NAME]: [
    ConversationState.COLLECTING_EMAIL,
    ConversationState.ERROR_RECOVERY,
    ConversationState.GREETING, // Allow going back
  ],
  [ConversationState.COLLECTING_EMAIL]: [
    ConversationState.COLLECTING_PHONE,
    ConversationState.ERROR_RECOVERY,
    ConversationState.COLLECTING_NAME, // Allow going back
  ],
  [ConversationState.COLLECTING_PHONE]: [
    ConversationState.COLLECTING_ADDRESS,
    ConversationState.ERROR_RECOVERY,
    ConversationState.COLLECTING_EMAIL, // Allow going back
  ],
  [ConversationState.COLLECTING_ADDRESS]: [
    ConversationState.COLLECTING_ISSUE,
    ConversationState.ERROR_RECOVERY,
    ConversationState.COLLECTING_PHONE, // Allow going back
  ],
  [ConversationState.COLLECTING_ISSUE]: [
    ConversationState.CONFIRMING_DETAILS,
    ConversationState.ERROR_RECOVERY,
    ConversationState.COLLECTING_ADDRESS, // Allow going back
  ],
  [ConversationState.CONFIRMING_DETAILS]: [
    ConversationState.TICKET_CREATION,
    ConversationState.COLLECTING_NAME, // Allow editing any field
    ConversationState.COLLECTING_EMAIL,
    ConversationState.COLLECTING_PHONE,
    ConversationState.COLLECTING_ADDRESS,
    ConversationState.COLLECTING_ISSUE,
    ConversationState.ERROR_RECOVERY,
  ],
  [ConversationState.TICKET_CREATION]: [
    ConversationState.CONFIRMATION,
    ConversationState.ERROR_RECOVERY,
  ],
  [ConversationState.CONFIRMATION]: [ConversationState.ENDED],
  [ConversationState.ERROR_RECOVERY]: [
    ConversationState.GREETING,
    ConversationState.COLLECTING_NAME,
    ConversationState.COLLECTING_EMAIL,
    ConversationState.COLLECTING_PHONE,
    ConversationState.COLLECTING_ADDRESS,
    ConversationState.COLLECTING_ISSUE,
    ConversationState.CONFIRMING_DETAILS,
    ConversationState.ENDED,
  ],
  [ConversationState.ENDED]: [],
};

/**
 * Check if a state transition is valid
 */
export const isValidTransition = (
  fromState: ConversationState,
  toState: ConversationState,
): boolean => {
  return validTransitions[fromState]?.includes(toState) ?? false;
};

/**
 * Get the next expected state in the happy path
 */
export const getNextState = (currentState: ConversationState): ConversationState | null => {
  const transitions = validTransitions[currentState];
  // Return the first transition (happy path)
  return transitions && transitions.length > 0 ? (transitions[0] ?? null) : null;
};

/**
 * Check if all required information is collected
 */
export const isDataComplete = (context: ConversationContext): boolean => {
  return !!(
    context.name &&
    context.email &&
    context.phone &&
    context.address &&
    context.issue &&
    context.issueType &&
    context.price !== undefined
  );
};

/**
 * Get missing fields from context
 */
export const getMissingFields = (context: ConversationContext): string[] => {
  const missing: string[] = [];

  if (!context.name) missing.push('name');
  if (!context.email) missing.push('email');
  if (!context.phone) missing.push('phone');
  if (!context.address) missing.push('address');
  if (!context.issue) missing.push('issue description');

  return missing;
};
