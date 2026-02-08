import {
  ConversationState,
  getMissingFields,
  isValidTransition,
} from '../src/domain/conversation/state';
describe('Conversation State Machine', () => {
  describe('isValidTransition', () => {
    it('should allow greeting to collecting name', () => {
      expect(isValidTransition(ConversationState.GREETING, ConversationState.COLLECTING_NAME)).toBe(
        true,
      );
    });
    it('should allow going back from collecting email to name', () => {
      expect(
        isValidTransition(ConversationState.COLLECTING_EMAIL, ConversationState.COLLECTING_NAME),
      ).toBe(true);
    });
    it('should not allow invalid transitions', () => {
      expect(isValidTransition(ConversationState.GREETING, ConversationState.CONFIRMATION)).toBe(
        false,
      );
    });
    it('should not allow transitions from ended state', () => {
      expect(isValidTransition(ConversationState.ENDED, ConversationState.GREETING)).toBe(false);
    });
  });
  describe('getMissingFields', () => {
    it('should return all fields when context is empty', () => {
      const context = { metadata: {} };
      const missing = getMissingFields(context);
      expect(missing).toContain('name');
      expect(missing).toContain('email');
      expect(missing).toContain('phone');
      expect(missing).toContain('address');
      expect(missing).toContain('issue description');
    });
    it('should return only missing fields', () => {
      const context = {
        name: 'John',
        email: 'john@example.com',
        metadata: {},
      };
      const missing = getMissingFields(context);
      expect(missing).not.toContain('name');
      expect(missing).not.toContain('email');
      expect(missing).toContain('phone');
    });
  });
});
