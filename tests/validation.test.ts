import { validateEmail, validateName, validatePhone } from '../src/utils/validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should trim and lowercase email', () => {
      const result = validateEmail('  USER@EXAMPLE.COM  ');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('user@example.com');
    });
  });

  describe('validatePhone', () => {
    it('should validate 10-digit phone', () => {
      const result = validatePhone('5105551234');
      expect(result.isValid).toBe(true);
    });

    it('should validate formatted phone', () => {
      const result = validatePhone('(510) 555-1234');
      expect(result.isValid).toBe(true);
    });

    it('should reject too short phone', () => {
      const result = validatePhone('123456');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateName', () => {
    it('should validate normal name', () => {
      const result = validateName('John Doe');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('John Doe');
    });

    it('should reject too short name', () => {
      const result = validateName('J');
      expect(result.isValid).toBe(false);
    });

    it('should reject non-alphabetic', () => {
      const result = validateName('123');
      expect(result.isValid).toBe(false);
    });
  });
});
