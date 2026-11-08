const test = require("node:test");
const assert = require("node:assert/strict");
const { stripHtml, cleanValue, sanitizeRequest } = require("../middleware/sanitizeMiddleware.js");

test("stripHtml removes dangerous markup tags", () => {
  assert.equal(stripHtml("<script>alert('xss')</script>Hello"), "Hello");
  assert.equal(stripHtml("<b>Bold</b> and <i>Italic</i>"), "Bold and Italic");
  assert.equal(stripHtml("<style>body{color:red;}</style>Content"), "Content");
  assert.equal(stripHtml("Normal Text"), "Normal Text");
});

test("cleanValue strips NoSQL injection operator keys ($)", () => {
  const maliciousQuery = {
    $gt: "",
    $ne: null,
    validField: "test",
  };
  const sanitized = cleanValue(maliciousQuery);
  assert.equal(sanitized.$gt, undefined);
  assert.equal(sanitized.$ne, undefined);
  assert.equal(sanitized.validField, "test");
});

test("cleanValue drops a __proto__ key so it cannot change the prototype of the cleaned object", () => {
  // JSON.parse keeps __proto__ as an ordinary key, which is how it arrives in a request body
  const body = JSON.parse(
    '{"name":"Thandi","__proto__":{"role":"admin"},"nested":{"__proto__":{"isAdmin":true}}}'
  );
  const cleaned = cleanValue(body);

  assert.equal(cleaned.name, "Thandi");
  assert.equal(Object.keys(cleaned).includes("__proto__"), false);
  assert.equal(cleaned.role, undefined);
  assert.equal(cleaned.nested.isAdmin, undefined);
  assert.equal(Object.getPrototypeOf(cleaned), Object.prototype);
  assert.equal(Object.getPrototypeOf(cleaned.nested), Object.prototype);
});

test("sanitizeRequest middleware cleans req.body, req.query, and req.params", () => {
  const req = {
    path: "/api/gigs",
    body: {
      title: "Clean <script>evil()</script>Title",
      filter: { $where: "sleep(5000)" },
    },
    query: {
      search: "<svg onload=alert(1)>Query",
    },
    params: {
      id: "60d5ec49f1b2c82d881e4f11",
    },
  };
  const res = {};
  let calledNext = false;
  const next = () => {
    calledNext = true;
  };

  sanitizeRequest(req, res, next);
  assert.equal(calledNext, true);
  assert.equal(req.body.title, "Clean Title");
  assert.equal(req.body.filter.$where, undefined);
  assert.equal(req.query.search, "Query");
});
