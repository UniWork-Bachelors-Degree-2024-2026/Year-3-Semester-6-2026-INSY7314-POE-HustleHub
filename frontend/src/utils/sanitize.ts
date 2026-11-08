// Frontend input sanitisation. Everything the user types is cleaned here BEFORE it is validated
// or sent to the API. The backend still sanitises independently; this is the first layer, not the only one.
//
// Passwords are deliberately never sanitised: changing a password would break login.
// They are only checked against a regex (see utils/validation.ts).

/* eslint-disable no-control-regex */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/* eslint-enable no-control-regex */

// Zero-width characters and bidirectional overrides are used to hide or reorder text
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const HTML_TAGS = /<\/?[a-z!][^>]*>?/gi;
const ANGLE_BRACKETS = /[<>]/g;
const DANGEROUS_SCHEMES = /\b(?:javascript|vbscript|data)\s*:/gi;
const EVENT_HANDLERS = /\bon[a-z]{3,20}\s*=/gi;

// Characters that are never needed in this app's text fields and are common in injection payloads
const LIVE_BLOCKED = /[<>{}\\$`]/g;

interface TextOptions {
  /** Keep line breaks (descriptions and briefs). Single-line fields collapse them to spaces. */
  multiline?: boolean;
  /** Hard cap on length after cleaning. */
  max?: number;
}

/** Full clean-up for free text, used when a form is submitted. */
export function sanitizeText(value: unknown, { multiline = false, max }: TextOptions = {}): string {
  let s = String(value ?? "")
    .normalize("NFC")
    .replace(CONTROL_CHARS, "")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\r\n?/g, "\n");

  // Repeat until nothing changes, because removing one piece can join the rest into a new one (CodeQL, 2026b).
  // Every pass only removes text, so the loop always ends.
  let previous: string;
  do {
    previous = s;
    s = s.replace(HTML_TAGS, "").replace(DANGEROUS_SCHEMES, "").replace(EVENT_HANDLERS, "");
  } while (s !== previous);
  s = s.replace(ANGLE_BRACKETS, "").replace(LIVE_BLOCKED, "");

  if (multiline) {
    s = s
      .replace(/[^\S\n]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    s = s.replace(/\s+/g, " ");
  }
  s = s.trim();
  return max ? s.slice(0, max) : s;
}

/** Email: no whitespace, lower case, no markup. */
export const sanitizeEmail = (value: unknown): string =>
  sanitizeText(value).replace(/\s/g, "").toLowerCase().slice(0, 254);

/** Display name: letters (any language), digits, space and . _ ' - only. */
export const sanitizeUsername = (value: unknown): string =>
  sanitizeText(value)
    .replace(/[^\p{L}\p{M}0-9 ._'-]/gu, "")
    .slice(0, 30);

/** Search box text. */
export const sanitizeSearch = (value: unknown): string =>
  sanitizeText(value)
    .replace(/[^\p{L}\p{N} .,'&+#-]/gu, "")
    .slice(0, 80);

/** Keeps digits only, e.g. delivery days. */
export const digitsOnly = (value: unknown, max = 3): string =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, max);

/** Keeps digits and a single decimal point with at most two decimals, e.g. price. */
export function sanitizeDecimal(value: unknown): string {
  const cleaned = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const intPart = whole.slice(0, 7);
  return rest.length ? `${intPart}.${rest.join("").slice(0, 2)}` : intPart;
}

// ---- Live filters: run on every keystroke. They never trim or collapse spaces, so typing stays natural. ----

/** Stops markup and injection characters from being typed or pasted at all. */
export const liveClean = (value: string): string =>
  value.replace(CONTROL_CHARS, "").replace(INVISIBLE_CHARS, "").replace(LIVE_BLOCKED, "");

export const liveSearch = (value: string): string => value.replace(/[^\p{L}\p{N} .,'&+#-]/gu, "").slice(0, 80);

export const liveUsername = (value: string): string => value.replace(/[^\p{L}\p{M}0-9 ._'-]/gu, "").slice(0, 30);

// Reference List:
// CodeQL, 2026b. Incomplete multi-character sanitization. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-incomplete-multi-character-sanitization/> [Accessed 7 November 2026].
