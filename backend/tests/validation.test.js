const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EMAIL_REGEX,
  validatePasswordComplexity,
  validateRegistration,
  validateLogin,
} = require("../middleware/validationMiddleware.js");

test("Email regex accepts valid emails and rejects malformed formats", () => {
  assert.ok(EMAIL_REGEX.test("test@example.com"));
  assert.ok(EMAIL_REGEX.test("user.name+tag@domain.co.za"));
  assert.ok(!EMAIL_REGEX.test("missing-at-domain.com"));
  assert.ok(!EMAIL_REGEX.test("user@domain"));
  assert.ok(!EMAIL_REGEX.test("@domain.com"));
  assert.ok(!EMAIL_REGEX.test("user@.com"));
});

test("validatePasswordComplexity enforces security requirements", () => {
  // Missing / non-string returns string error
  assert.equal(validatePasswordComplexity(""), "Password is required.");
  assert.equal(validatePasswordComplexity(null), "Password is required.");

  // Too short (< 8 chars)
  assert.equal(
    validatePasswordComplexity("Ab1!"),
    "Password does not meet the complexity requirements."
  );

  // Missing uppercase
  assert.equal(
    validatePasswordComplexity("lowercase1!"),
    "Password does not meet the complexity requirements."
  );

  // Missing lowercase
  assert.equal(
    validatePasswordComplexity("UPPERCASE1!"),
    "Password does not meet the complexity requirements."
  );

  // Missing number
  assert.equal(
    validatePasswordComplexity("NoNumbersHere!"),
    "Password does not meet the complexity requirements."
  );

  // Missing special char
  assert.equal(
    validatePasswordComplexity("PlainPassword123"),
    "Password does not meet the complexity requirements."
  );

  // Compliant password returns null (no error)
  const valid = validatePasswordComplexity("HustleHub_2026_Secure!");
  assert.equal(valid, null);
});

test("validateRegistration middleware blocks invalid payloads", () => {
  const req = {
    body: {
      username: "a", // too short
      email: "invalid-email",
      password: "weak",
      role: "superuser", // invalid role
    },
  };
  let status = 0;
  let jsonResponse = null;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };
  let calledNext = false;
  const next = () => {
    calledNext = true;
  };

  validateRegistration(req, res, next);
  assert.equal(status, 400);
  assert.equal(calledNext, false);
  assert.ok(jsonResponse.errors.length > 0);
});

test("validateLogin middleware requires email and password", () => {
  const req = { body: {} };
  let status = 0;
  let jsonResponse = null;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };
  let calledNext = false;
  const next = () => {
    calledNext = true;
  };

  validateLogin(req, res, next);
  assert.equal(status, 400);
  assert.equal(calledNext, false);
  assert.equal(jsonResponse.message, "Invalid credentials. Email or Password Incorrect.");
});
