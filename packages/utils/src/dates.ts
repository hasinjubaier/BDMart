/**
 * Standard timezone for BDMart platform operations: Asia/Dhaka (UTC+6).
 */
export const DHAKA_TIMEZONE = "Asia/Dhaka";

/**
 * Returns formatted ISO-like string in Dhaka time.
 */
export function formatDhakaDate(date: Date | string = new Date()): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(targetDate);
}
