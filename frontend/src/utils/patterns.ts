// Central list of the regular expressions used to validate input on the frontend.
// Each one is a WHITELIST: it describes what is allowed, and everything else is rejected.
// Input is sanitised first (utils/sanitize.ts), then must match one of these before it is sent.

// Letters (any language), accents, digits and the punctuation people normally use in writing.
// Deliberately excludes < > { } \ $ | ^ ~ and the backtick.
const TEXT_CHARS = "\\p{L}\\p{M}\\p{N}\\s.,:;!?&()\\[\\]'\"’“”‘/+#%@*_-";

const textBlock = (min: number, max: number) => new RegExp(`^[${TEXT_CHARS}]{${min},${max}}$`, "u");

export const PATTERNS = {
  /** 2 to 30 characters: letters, digits, space, . _ ' - */
  username: /^[\p{L}\p{M}0-9 ._'-]{2,30}$/u,
  /** Same rule as backend/middleware/validationMiddleware.js */
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  /** Gig title, 5 to 100 characters, no line breaks */
  gigTitle: new RegExp(`^[${TEXT_CHARS.replace("\\s", " ")}]{5,100}$`, "u"),
  /** Gig description, 20 to 2000 characters, line breaks allowed */
  gigDescription: textBlock(20, 2000),
  /** Booking brief, 10 to 1000 characters, line breaks allowed */
  bookingBrief: textBlock(10, 1000),
  /** Whole rand or rand and cents: 1 to 7 digits, optional 1-2 decimals */
  price: /^[1-9]\d{0,6}(?:\.\d{1,2})?$/,
  /** Whole days, 1 to 99 (range is checked as 1 to 90 in code) */
  days: /^[1-9]\d?$/,
  /** Search text, up to 80 characters */
  search: /^[\p{L}\p{N} .,'&+#-]{0,80}$/u,
  /** MongoDB ObjectId, used to check route parameters before they reach the API */
  objectId: /^[a-f\d]{24}$/i,
  /** YYYY-MM-DD with a valid month and day range */
  isoDate: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
  /** The only payment methods the simulated checkout accepts */
  paymentMethod: /^simulated_(?:card|eft)$/,
} as const;
