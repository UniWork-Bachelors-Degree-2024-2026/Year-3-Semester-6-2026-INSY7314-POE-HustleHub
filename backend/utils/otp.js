// Helpers for generating and checking one time passcodes (OTPs)
const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 60;

// Picks a random number below 1 000 000 and pads it so leading zeros are kept.
const generateCode = () => String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");

// Keyed hash of the code, so a leaked database alone cannot reveal the six digits.
const hashCode = (email, purpose, code) => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  return crypto.createHmac("sha256", secret).update(`${purpose}:${email}:${code}`).digest("hex");
};

// Compares the stored hash with the hash of the submitted code in constant time.
const codesMatch = (storedHash, email, purpose, code) => {
  const submitted = Buffer.from(hashCode(email, purpose, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return submitted.length === stored.length && crypto.timingSafeEqual(submitted, stored);
};

// Seconds left before another code may be sent, or 0 when sending is allowed.
const secondsUntilResend = (lastSentAt) => {
  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - elapsed));
};

module.exports = {
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  generateCode,
  hashCode,
  codesMatch,
  secondsUntilResend,
};
