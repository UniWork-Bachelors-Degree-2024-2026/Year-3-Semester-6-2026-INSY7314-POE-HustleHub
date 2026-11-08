const test = require("node:test");
const assert = require("node:assert/strict");
const {
  OTP_LENGTH,
  OTP_RESEND_SECONDS,
  generateCode,
  hashCode,
  codesMatch,
  secondsUntilResend,
} = require("../utils/otp.js");

test("OTP Generator generates 6 digit numeric string", () => {
  const code = generateCode();
  assert.equal(typeof code, "string");
  assert.equal(code.length, OTP_LENGTH);
  assert.match(code, /^\d{6}$/);
});

test("hashCode produces consistent SHA256 HMAC digest", () => {
  process.env.OTP_SECRET = "test_otp_secret_key_12345";
  const email = "user@example.com";
  const purpose = "verify_email";
  const code = "123456";

  const hash1 = hashCode(email, purpose, code);
  const hash2 = hashCode(email, purpose, code);

  assert.equal(typeof hash1, "string");
  assert.equal(hash1.length, 64); // 32 bytes hex = 64 chars
  assert.equal(hash1, hash2);

  // Different code or purpose yields different hash
  assert.notEqual(hash1, hashCode(email, purpose, "654321"));
  assert.notEqual(hash1, hashCode(email, "reset_password", code));
});

test("codesMatch verifies valid code and rejects invalid code in constant time", () => {
  process.env.OTP_SECRET = "test_otp_secret_key_12345";
  const email = "user@example.com";
  const purpose = "verify_email";
  const correctCode = "481920";
  const storedHash = hashCode(email, purpose, correctCode);

  assert.equal(codesMatch(storedHash, email, purpose, correctCode), true);
  assert.equal(codesMatch(storedHash, email, purpose, "000000"), false);
  assert.equal(codesMatch(storedHash, "different@example.com", purpose, correctCode), false);
});

test("secondsUntilResend respects cooldown period", () => {
  const now = new Date();
  assert.equal(secondsUntilResend(now), OTP_RESEND_SECONDS);

  const pastDate = new Date(Date.now() - (OTP_RESEND_SECONDS + 5) * 1000);
  assert.equal(secondsUntilResend(pastDate), 0);

  const halfDate = new Date(Date.now() - 30 * 1000);
  assert.ok(secondsUntilResend(halfDate) <= 30);
});
