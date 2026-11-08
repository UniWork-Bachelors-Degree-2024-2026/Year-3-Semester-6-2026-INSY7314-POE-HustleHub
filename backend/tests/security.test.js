const test = require("node:test");
const assert = require("node:assert/strict");

// Own security features: CORS origin parsing and account lockout helpers (no database needed)
process.env.JWT_SECRET = "test_jwt_secret_key_1234567890";

const { parseAllowedOrigins } = require("../middleware/securityMiddleware.js");
const { lockSecondsRemaining, MAX_FAILED_LOGINS, LOCKOUT_MINUTES } = require("../utils/lockout.js");
const { generateToken } = require("../utils/token.js");
const jwt = require("jsonwebtoken");

test("ALLOWED_ORIGINS falls back to the local frontend when empty", () => {
  assert.deepEqual(parseAllowedOrigins(""), ["https://localhost:5173"]);
  assert.deepEqual(parseAllowedOrigins(undefined), ["https://localhost:5173"]);
});

test("ALLOWED_ORIGINS accepts several origins and trims spaces and trailing slashes", () => {
  assert.deepEqual(parseAllowedOrigins("https://a.example.com/, https://b.example.com ,"), [
    "https://a.example.com",
    "https://b.example.com",
  ]);
});

test("lockout defaults are 5 attempts and 15 minutes", () => {
  assert.equal(MAX_FAILED_LOGINS, 5);
  assert.equal(LOCKOUT_MINUTES, 15);
});

test("an account with no lock has zero seconds remaining", () => {
  assert.equal(lockSecondsRemaining({}), 0);
  assert.equal(lockSecondsRemaining({ lockUntil: new Date(Date.now() - 1000) }), 0);
});

test("an active lock reports the seconds left", () => {
  const seconds = lockSecondsRemaining({ lockUntil: new Date(Date.now() + 90 * 1000) });
  assert.ok(seconds > 85 && seconds <= 90);
});

test("generateToken signs the id and role", () => {
  const token = generateToken("abc123", "client");
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(decoded.id, "abc123");
  assert.equal(decoded.role, "client");
});
