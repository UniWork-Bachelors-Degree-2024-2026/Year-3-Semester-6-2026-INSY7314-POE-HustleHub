const test = require("node:test");
const assert = require("node:assert/strict");

const { maskEmail } = require("../utils/maskEmail.js");

test("an email keeps its first letter and its domain only", () => {
  assert.equal(maskEmail("kyle@gmail.com"), "k***@gmail.com");
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
});

test("the name before the @ never appears in the result", () => {
  const masked = maskEmail("thandi.mokoena@example.co.za");
  assert.equal(masked, "t***@example.co.za");
  assert.equal(masked.includes("mokoena"), false);
});

test("the last @ marks the domain when the name contains one", () => {
  assert.equal(maskEmail("odd@name@example.com"), "o***@example.com");
});

test("a value that is not an email is hidden completely", () => {
  assert.equal(maskEmail("not an email"), "***");
  assert.equal(maskEmail("@example.com"), "***");
  assert.equal(maskEmail("name@"), "***");
  assert.equal(maskEmail(""), "***");
});

test("anything that is not text is hidden completely", () => {
  assert.equal(maskEmail(undefined), "***");
  assert.equal(maskEmail(null), "***");
  assert.equal(maskEmail({ $ne: "x@y.com" }), "***");
  assert.equal(maskEmail(["a@b.com"]), "***");
});

test("a line break typed into the field cannot split a log line", () => {
  const masked = maskEmail("a@evil.com\nINFO fake entry");
  assert.equal(masked.includes("\n"), false);
  assert.equal(masked, "a***@evil.com?INFO fake entry");
});

test("a very long domain is cut short", () => {
  assert.ok(maskEmail(`a@${"d".repeat(1000)}`).length <= 260);
});
