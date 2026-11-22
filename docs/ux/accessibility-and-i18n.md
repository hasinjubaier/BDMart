# Accessibility and Internationalization Specification

## 1. Internationalization Architecture (`next-intl`)

BD Mart is architected as a **Bangla-First** platform, reflecting the linguistic requirements of Bangladeshi retail consumers and commercial traders.

### 1.1. Locale Routing & Configuration
- **Supported Locales:** `bn` (Bengali - Default), `en` (English).
- **Routing Strategy:** Next.js dynamic segment `[locale]` with automatic browser locale detection and fallback to `bn`.
- **Message Dictionary Structure:**
  - `messages/bn.json` — Definitive master Bengali copy.
  - `messages/en.json` — Complete English translation parity.
  - Hardcoded strings in TSX/JSX components are strictly prohibited.

### 1.2. Number & Currency Formatting Standard
- **Helper Implementation (`lib/utils/format.ts`):**
  ```typescript
  export function formatBDT(amountInPoisha: number | bigint, locale: 'bn' | 'en' = 'bn'): string {
    const taka = Number(amountInPoisha) / 100;
    const formattedNumber = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(taka);

    return `৳${formattedNumber}`;
  }
  ```
- **Example Outputs:**
  - `formatBDT(145000, 'bn')` $\rightarrow$ `৳১,৪৫০`
  - `formatBDT(145000, 'en')` $\rightarrow$ `৳1,450`

### 1.3. Date and Time Localization
- All timestamps stored in UTC in the database.
- Formatted on the client using the `Asia/Dhaka` timezone offset (+06:00).
- Example: `২৩ নভেম্বর ২০২৬, রাত ৪:০০` (Bengali) / `23 November 2026, 4:00 AM` (English).

---

## 2. Accessibility Specification (WCAG 2.2 AA Compliance)

BD Mart enforces strict adherence to WCAG 2.2 Level AA accessibility guidelines:

### 2.1. Color Contrast Standards
- Text vs. Background: Minimum contrast ratio of **4.5:1** for standard body text; **3:1** for large headings and active UI icons.
- System feedback (error, warning, success) is never conveyed through color alone; every status badge pairs a color with a distinct icon and descriptive text label.

### 2.2. Keyboard Navigation & Focus Management
- **Logical Tab Order:** All interactive controls (buttons, links, form inputs) are fully reachable via the `Tab` key in sequential reading order.
- **Visible Focus Rings:** Focused elements receive a high-visibility, 2px solid ring (`ring-2 ring-primary ring-offset-2`).
- **Modal Focus Traps:** Modal bottom sheets (e.g., Quick Buy, Address Selector) trap focus while open and restore focus to the trigger button upon dismissal via `Esc` or close button.

### 2.3. Screen Reader & ARIA Implementation
- **Meaningful Alt Text:** All product images must render descriptive `alt` tags (e.g., `alt="প্রাকৃতিক পাট দিয়ে তৈরি পরিবেশবান্ধব টোট ব্যাগ"`). Decorative icons use `aria-hidden="true"`.
- **Live Regions:** Dynamic cart total updates and form submission error alerts use `aria-live="polite"` or `role="alert"` so assistive screen readers announce changes immediately.
- **Automated Testing:** CI/CD runs `@axe-core/playwright` across all primary screen archetypes; any critical or serious violation fails the build.
