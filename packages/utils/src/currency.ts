/**
 * Convert integer paisa (64-bit integer representation) to decimal Bangladeshi Taka (BDT).
 * 1 BDT = 100 Paisa.
 */
export function paisaToBdt(paisa: number | bigint): number {
  const numericPaisa = typeof paisa === "bigint" ? Number(paisa) : paisa;
  return numericPaisa / 100;
}

/**
 * Convert decimal Bangladeshi Taka (BDT) to integer paisa.
 * Avoids IEEE-754 precision issues using Math.round.
 */
export function bdtToPaisa(bdt: number): number {
  return Math.round(bdt * 100);
}

export interface FormatBdtOptions {
  showSymbol?: boolean;
  locale?: "en-BD" | "bn-BD";
}

/**
 * Format integer paisa as a human-readable BDT currency string.
 * Example: 150050 -> "৳1,500.50" or "1,500.50"
 */
export function formatBdt(
  paisa: number | bigint,
  options: FormatBdtOptions = {},
): string {
  const { showSymbol = true, locale = "en-BD" } = options;
  const bdt = paisaToBdt(paisa);

  const formattedNumber = new Intl.NumberFormat(
    locale === "bn-BD" ? "bn-BD" : "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(bdt);

  return showSymbol ? `৳${formattedNumber}` : formattedNumber;
}
