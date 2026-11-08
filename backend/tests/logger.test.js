const test = require("node:test");
const assert = require("node:assert/strict");

const logger = require("../utils/logger.js");

test("stripLineBreaks removes carriage returns and new lines", () => {
  assert.equal(logger.stripLineBreaks("one\ntwo\r\nthree\rfour"), "onetwothreefour");
  assert.equal(logger.stripLineBreaks("no breaks here"), "no breaks here");
});

test("stripLineBreaks turns other values into text first", () => {
  assert.equal(logger.stripLineBreaks(42), "42");
  assert.equal(logger.stripLineBreaks(undefined), "undefined");
});

test("a message with a line break is written as one line, so it cannot forge an entry", (t) => {
  // The mock replaces the terminal output for this test only and records every call
  const output = t.mock.method(console, "log", () => {});
  logger.warn(
    "Login failed for someone\n[2026-01-01 00:00:00] [INFO] [AUTH]: forged entry",
    "TEST"
  );

  assert.equal(output.mock.callCount(), 1);
  const line = String(output.mock.calls[0].arguments[0]);
  assert.equal(line.includes("\n"), false);
  assert.equal(line.includes("\r"), false);
});

test("the error line added after the message is also kept on one line", (t) => {
  const output = t.mock.method(console, "log", () => {});
  const error = new Error("bad\ninput");
  // Without a stack the logger builds the line from the error's own message, which can hold a line break
  error.stack = undefined;
  logger.error("Something failed", "TEST", error);

  // The logger adds one deliberate line break before the error line, and nothing else may add another
  const line = String(output.mock.calls[0].arguments[0]);
  assert.equal(line.split("\n").length - 1, 1);
});
