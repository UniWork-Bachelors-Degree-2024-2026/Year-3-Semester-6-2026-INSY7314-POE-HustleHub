// Gig form validation. Values are sanitised first, then must match the regex whitelists in patterns.ts.
// Mirrors backend/middleware/validationMiddleware.js so users get instant feedback;
// the backend remains the source of truth.

import { PATTERNS } from "./patterns.ts";
import { sanitizeText } from "./sanitize.ts";

export interface GigDraft {
  title: string;
  description: string;
  category: string;
  price: string;
  deliveryTimeDays: string;
}

export type GigErrors = Partial<Record<keyof GigDraft, string>>;

const TEXT_HELP = "only letters, numbers and basic punctuation";

/** Returns the sanitised version of every field. This is what gets validated and sent. */
export function cleanGigDraft(d: GigDraft): GigDraft {
  return {
    title: sanitizeText(d.title),
    description: sanitizeText(d.description, { multiline: true }),
    category: sanitizeText(d.category),
    price: d.price.replace(/\s/g, ""),
    deliveryTimeDays: d.deliveryTimeDays.replace(/\s/g, ""),
  };
}

export function validateGigDraft(raw: GigDraft, categories: readonly string[]): GigErrors {
  const d = cleanGigDraft(raw);
  const e: GigErrors = {};
  if (!PATTERNS.gigTitle.test(d.title)) e.title = `Title must be 5 to 100 characters, using ${TEXT_HELP}.`;
  if (!PATTERNS.gigDescription.test(d.description)) {
    e.description = `Describe the gig in 20 to 2000 characters, using ${TEXT_HELP}.`;
  }
  if (!categories.includes(d.category)) e.category = "Choose a category.";
  if (!PATTERNS.price.test(d.price) || Number(d.price) < 1 || Number(d.price) > 1_000_000) {
    e.price = "Enter a price between R 1 and R 1 000 000, with up to two decimals.";
  }
  if (!PATTERNS.days.test(d.deliveryTimeDays) || Number(d.deliveryTimeDays) > 90) {
    e.deliveryTimeDays = "Delivery must be a whole number of days from 1 to 90.";
  }
  return e;
}
