/**
 * Normalizes and validates Bangladeshi mobile phone numbers.
 *
 * Rules:
 * - Uses standard ASCII digits (0-9).
 * - Strips whitespace, dashes, dots, and parentheses.
 * - Accepts local format: `01[3-9]XXXXXXXX` (11 digits).
 * - Accepts international format: `+8801[3-9]XXXXXXXX` or `8801[3-9]XXXXXXXX`.
 * - Canonical output is always `+8801[3-9]XXXXXXXX` (E.164 standard).
 * - Rejects non-BD numbers, incorrect lengths, or invalid operator prefixes with an English error message.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

export function normalizeBdPhoneNumber(input: string): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Please enter a mobile phone number.',
    };
  }

  // Remove common separators (spaces, dashes, parentheses, dots)
  const cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  // Handle leading "+" or international prefixes
  let standardDigits: string;

  if (cleaned.startsWith('+880')) {
    standardDigits = cleaned.slice(4); // Remove '+880'
  } else if (cleaned.startsWith('880')) {
    standardDigits = cleaned.slice(3); // Remove '880'
  } else if (cleaned.startsWith('0')) {
    standardDigits = cleaned.slice(1); // Remove leading '0' once
  } else {
    standardDigits = cleaned;
  }

  // At this point, a valid Bangladeshi number must be exactly 10 digits starting with 1[3-9]
  // e.g. '1712345678'
  const bdMobileRegex = /^1[3-9]\d{8}$/;

  if (!bdMobileRegex.test(standardDigits)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Please enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX).',
    };
  }

  return {
    isValid: true,
    normalized: `+880${standardDigits}`,
  };
}
