/**
 * Utility functions for formatting currencies, numbers, and slugs in BD Mart.
 * Follows the integer-poisha financial representation standard (1 BDT = 100 poisha).
 */

export function poishaToBdt(poisha: number | bigint | string): number {
  const p = typeof poisha === 'bigint' ? Number(poisha) : Number(poisha);
  return p / 100;
}

export function bdtToPoisha(bdt: number): number {
  return Math.round(bdt * 100);
}

/**
 * Formats poisha into standard BDT display string in English.
 * E.g., 35000 poisha -> "BDT 350"
 *       35050 poisha -> "BDT 350.50"
 */
export function formatBDT(poisha: number | bigint | string): string {
  const p = typeof poisha === 'bigint' ? Number(poisha) : Number(poisha);
  if (isNaN(p)) return 'BDT 0';

  const bdt = p / 100;
  if (p % 100 === 0) {
    return `BDT ${bdt.toLocaleString('en-US')}`;
  }
  return `BDT ${bdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Generates a URL-safe slug from a title.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
