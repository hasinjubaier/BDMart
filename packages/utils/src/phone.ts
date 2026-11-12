/**
 * Validates whether a given string is a valid Bangladesh mobile number.
 * Supported mobile operator codes: 013, 014, 015, 016, 017, 018, 019
 */
export function isValidBangladeshPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  // Formats: 01XXXXXXXXX (11 digits) or 8801XXXXXXXXX (13 digits)
  return /^(?:880)?1[3-9]\d{8}$/.test(digits);
}

/**
 * Normalizes any Bangladesh mobile phone format to the standard E.164 format (+8801XXXXXXXXX).
 */
export function normalizeBangladeshPhone(phone: string): string {
  if (!phone) {
    throw new Error("Phone number is required");
  }
  const digits = phone.replace(/\D/g, "");

  if (
    digits.startsWith("880") &&
    digits.length === 13 &&
    /^8801[3-9]\d{8}$/.test(digits)
  ) {
    return `+${digits}`;
  }
  if (
    digits.startsWith("0") &&
    digits.length === 11 &&
    /^01[3-9]\d{8}$/.test(digits)
  ) {
    return `+88${digits}`;
  }
  if (
    digits.length === 10 &&
    digits.startsWith("1") &&
    /^1[3-9]\d{8}$/.test(digits)
  ) {
    return `+880${digits}`;
  }
  throw new Error(`Invalid Bangladesh phone number format: ${phone}`);
}

/**
 * Masks a phone number for privacy display (e.g., "+88017****1234").
 */
export function maskPhoneNumber(phone: string): string {
  try {
    const normalized = normalizeBangladeshPhone(phone);
    return `${normalized.slice(0, 6)}****${normalized.slice(-4)}`;
  } catch {
    return phone;
  }
}
