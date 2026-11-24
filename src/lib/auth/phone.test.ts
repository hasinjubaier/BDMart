import { describe, it, expect } from 'vitest';
import { normalizeBdPhoneNumber } from './phone';

describe('Bangladeshi Phone Number Normalization (English-Only)', () => {
  it('normalizes valid 11-digit local format (01XXXXXXXXX)', () => {
    const res = normalizeBdPhoneNumber('01712345678');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+8801712345678');
    expect(res.error).toBeUndefined();
  });

  it('normalizes valid international format with plus (+8801XXXXXXXXX)', () => {
    const res = normalizeBdPhoneNumber('+8801712345678');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+8801712345678');
  });

  it('normalizes valid international format without plus (8801XXXXXXXXX)', () => {
    const res = normalizeBdPhoneNumber('8801712345678');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('+8801712345678');
  });

  it('handles spaces, dashes, dots, and parentheses cleanly', () => {
    expect(normalizeBdPhoneNumber('01712-345678').normalized).toBe('+8801712345678');
    expect(normalizeBdPhoneNumber('+880 1712 345 678').normalized).toBe('+8801712345678');
    expect(normalizeBdPhoneNumber('(01712) 345678').normalized).toBe('+8801712345678');
    expect(normalizeBdPhoneNumber('01712.345678').normalized).toBe('+8801712345678');
  });

  it('accepts all valid Bangladeshi mobile operator prefixes (013 - 019)', () => {
    const operators = [
      '01312345678', // Grameenphone
      '01412345678', // Banglalink
      '01512345678', // Teletalk
      '01612345678', // Airtel
      '01712345678', // Grameenphone
      '01812345678', // Robi
      '01912345678', // Banglalink
    ];

    for (const num of operators) {
      const res = normalizeBdPhoneNumber(num);
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe(`+880${num.slice(1)}`);
    }
  });

  it('rejects invalid lengths with an English error message', () => {
    const shortRes = normalizeBdPhoneNumber('017123456');
    expect(shortRes.isValid).toBe(false);
    expect(shortRes.error).toContain('Please enter a valid Bangladeshi mobile number');

    const longRes = normalizeBdPhoneNumber('017123456789');
    expect(longRes.isValid).toBe(false);
    expect(longRes.error).toContain('Please enter a valid Bangladeshi mobile number');
  });

  it('rejects invalid operator codes (e.g. 010, 011, 012)', () => {
    expect(normalizeBdPhoneNumber('01012345678').isValid).toBe(false);
    expect(normalizeBdPhoneNumber('01112345678').isValid).toBe(false);
    expect(normalizeBdPhoneNumber('01212345678').isValid).toBe(false);
  });

  it('rejects non-numeric characters and empty inputs', () => {
    const emptyRes = normalizeBdPhoneNumber('');
    expect(emptyRes.isValid).toBe(false);
    expect(emptyRes.error).toBe('Please enter a mobile phone number.');

    expect(normalizeBdPhoneNumber('abcdefghijk').isValid).toBe(false);
    expect(normalizeBdPhoneNumber('0171234abcd').isValid).toBe(false);
  });
});
