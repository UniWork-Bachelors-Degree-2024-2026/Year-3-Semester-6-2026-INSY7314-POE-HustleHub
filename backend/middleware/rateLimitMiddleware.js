const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger.js");

// Builds a limiter with a time window, a request limit and a custom handler that sends the 429 response (express-rate-limit, 2026).
const buildLimiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    // Sends one combined RateLimit header and turns off the legacy X-RateLimit headers (express-rate-limit, 2026).
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "unknown";
      logger.warn(
        `Rate limit exceeded on ${req.method} ${req.originalUrl || req.url} by IP: ${ip}`,
        "RATE_LIMIT"
      );
      res.set("Retry-After", String(retryAfter));
      res.status(429).json({ success: false, message, retryAfterSeconds: retryAfter });
    },
  });

const MINUTE = 60 * 1000;

// Reads a positive whole number from the environment, otherwise uses the default.
const limitFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  return fallback;
};

// Ceiling of 300 requests per 15 minutes for the whole API.
const apiLimiter = buildLimiter(
  15 * MINUTE,
  limitFromEnv("API_RATE_LIMIT_MAX", 300),
  "Too many requests. Please slow down and try again shortly."
);

// Login and registration allow 10 attempts per 15 minutes.
const authLimiter = buildLimiter(
  15 * MINUTE,
  limitFromEnv("AUTH_RATE_LIMIT_MAX", 10),
  "Too many authentication attempts. Please try again in 15 minutes."
);

// Booking creation allows 20 requests per 15 minutes.
const bookingLimiter = buildLimiter(
  15 * MINUTE,
  limitFromEnv("BOOKING_RATE_LIMIT_MAX", 20),
  "Too many booking requests. Please try again later."
);

// Code confirmation and password reset allow 20 requests per 15 minutes.
const otpLimiter = buildLimiter(
  15 * MINUTE,
  limitFromEnv("OTP_RATE_LIMIT_MAX", 20),
  "Too many code attempts. Please try again later."
);

// Profile, email and password changes allow 15 requests per 15 minutes, which also slows guessing the current password.
const accountLimiter = buildLimiter(
  15 * MINUTE,
  limitFromEnv("ACCOUNT_RATE_LIMIT_MAX", 15),
  "Too many account changes. Please try again later."
);

// CSP violation reports arrive in bursts from browsers, so 60 per 15 minutes are allowed.
const cspReportLimiter = buildLimiter(15 * MINUTE, 60, "Too many reports received.");

module.exports = {
  apiLimiter,
  authLimiter,
  bookingLimiter,
  otpLimiter,
  accountLimiter,
  cspReportLimiter,
};

// Reference List:
// express-rate-limit, 2026. Configuration. [online] Available at: <https://express-rate-limit.mintlify.app/reference/configuration> [Accessed 8 October 2026].
