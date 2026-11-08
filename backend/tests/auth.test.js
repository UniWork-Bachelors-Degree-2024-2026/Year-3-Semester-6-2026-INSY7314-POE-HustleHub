const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

test("JWT generates signed token and verifies claims securely", () => {
  const secret = "test_jwt_secret_key_1234567890";
  const payload = {
    userId: "60d5ec49f1b2c82d881e4f11",
    email: "freelancer@example.com",
    role: "freelancer",
  };

  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  assert.equal(typeof token, "string");
  assert.equal(token.split(".").length, 3); // header.payload.signature

  // Verify decoded claims
  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.userId, payload.userId);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.role, payload.role);
});

test("JWT rejects tampered or forged tokens", () => {
  const secret = "test_jwt_secret_key_1234567890";
  const token = jwt.sign({ role: "client" }, secret, { expiresIn: "1h" });

  assert.throws(() => {
    jwt.verify(token, "wrong_secret_key");
  }, /invalid signature/);
});

test("JWT rejects expired tokens", async () => {
  const secret = "test_jwt_secret_key_1234567890";
  const expiredToken = jwt.sign({ role: "client" }, secret, { expiresIn: "1ms" });

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.throws(() => {
    jwt.verify(expiredToken, secret);
  }, /jwt expired/);
});
