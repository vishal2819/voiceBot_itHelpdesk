/**
 * Validation utilities for user input
 * Deterministic validation to avoid relying purely on LLM
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate email address with comprehensive regex
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmed = email.trim().toLowerCase();

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid email format. Please provide a valid email address like user@example.com',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
};

/**
 * Validate phone number (supports multiple formats)
 */
export const validatePhone = (phone: string): ValidationResult => {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');

  // Accept 10-15 digits (covers most international formats)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Invalid phone number. Please provide a valid phone number with 10-15 digits',
    };
  }

  // Format as international if starts with country code
  let formatted = phone.trim();
  if (digitsOnly.length === 10) {
    // US format: (XXX) XXX-XXXX
    formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }

  return {
    isValid: true,
    sanitized: formatted,
  };
};

/**
 * Validate address (basic check for minimum content)
 */
export const validateAddress = (address: string): ValidationResult => {
  const trimmed = address.trim();

  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: 'Address is too short. Please provide a complete address with street, city, and state',
    };
  }

  if (trimmed.length > 500) {
    return {
      isValid: false,
      error: 'Address is too long. Please provide a concise address',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
};

/**
 * Validate name (basic check)
 */
export const validateName = (name: string): ValidationResult => {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Name is too short. Please provide your full name',
    };
  }

  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Name is too long',
    };
  }

  // Check for at least some alphabetic characters
  if (!/[a-zA-Z]{2,}/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Name must contain alphabetic characters',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
};

/**
 * Validate issue description
 */
export const validateIssue = (issue: string): ValidationResult => {
  const trimmed = issue.trim();

  if (trimmed.length < 5) {
    return {
      isValid: false,
      error: 'Issue description is too short. Please describe your problem in more detail',
    };
  }

  if (trimmed.length > 1000) {
    return {
      isValid: false,
      error: 'Issue description is too long. Please provide a concise description',
    };
  }

  return {
    isValid: true,
    sanitized: trimmed,
  };
};

/**
 * Extract email from text using regex
 */
export const extractEmail = (text: string): string | null => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0].toLowerCase() : null;
};

/**
 * Extract phone number from text
 */
export const extractPhone = (text: string): string | null => {
  // Match various phone formats
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : null;
};

/**
 * Type guard to check if value is non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};
