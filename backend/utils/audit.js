// Own security feature: a stored audit trail of security events.
// Each record answers when, where, who and what (OWASP Foundation, 2026), and holds no passwords, codes, tokens or email addresses.
const logger = require("./logger.js");

const EVENT_TYPES = Object.freeze([
  "register",
  "login",
  "login_2fa",
  "account_lockout",
  "password_change",
  "password_reset",
  "two_factor_change",
]);
const OUTCOMES = Object.freeze(["success", "failure"]);

// The OWASP guidance names no retention period (OWASP Foundation, 2026), so 90 days is our own choice for the review window
const RETENTION_DAYS = 90;
const MAX_USER_AGENT_LENGTH = 200;
const MAX_DETAIL_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Builds the record to store, or returns null when the type or outcome is not one we know.
// Only the listed fields are copied, so nothing else from the request can end up in the database.
const buildEvent = ({ type, outcome, userId, detail, req }) => {
  if (!EVENT_TYPES.includes(type) || !OUTCOMES.includes(outcome)) {
    return null;
  }

  const event = { type, outcome };
  if (userId) {
    event.userId = userId;
  }
  if (typeof detail === "string" && detail.length > 0) {
    event.detail = detail.slice(0, MAX_DETAIL_LENGTH);
  }

  if (req) {
    // The browser reaches the API directly, so the address on the socket is the client's address
    if (req.ip) {
      event.ip = String(req.ip);
    }
    let agent;
    if (typeof req.get === "function") {
      agent = req.get("user-agent");
    }
    if (typeof agent === "string" && agent.length > 0) {
      event.userAgent = agent.slice(0, MAX_USER_AGENT_LENGTH);
    }
  }

  return event;
};

// Stores one event. A failure is logged and swallowed, so the audit trail can never break a login.
const recordEvent = async (fields, model = require("../models/auditEventModel.js")) => {
  try {
    const event = buildEvent(fields);
    if (!event) {
      logger.warn("Audit event skipped: unknown event type or outcome", "SECURITY");
      return false;
    }
    await model.create(event);
    return true;
  } catch (error) {
    logger.error(`Audit event could not be stored: ${error.message}`, "SECURITY", error);
    return false;
  }
};

// Reads the page, page size and type filter from a query string.
// Every value is checked against a fixed rule, so nothing typed in the URL reaches the database query.
const parseAuditQuery = (query) => {
  const source = query || {};
  const parsed = { page: 1, limit: DEFAULT_PAGE_SIZE };

  // Digits only and at most six of them, which also rules out signs, decimals and spaces
  const wholeNumber = (value) =>
    typeof value === "string" &&
    value.length > 0 &&
    value.length < 7 &&
    [...value].every((character) => character >= "0" && character <= "9");

  if (source.page !== undefined) {
    if (!wholeNumber(source.page) || Number(source.page) < 1) {
      return { error: "The page must be a whole number from 1." };
    }
    parsed.page = Number(source.page);
  }

  if (source.limit !== undefined) {
    if (
      !wholeNumber(source.limit) ||
      Number(source.limit) < 1 ||
      Number(source.limit) > MAX_PAGE_SIZE
    ) {
      return { error: `The page size must be a whole number from 1 to ${MAX_PAGE_SIZE}.` };
    }
    parsed.limit = Number(source.limit);
  }

  if (source.type !== undefined) {
    if (typeof source.type !== "string" || !EVENT_TYPES.includes(source.type)) {
      return { error: "That event type is not recognised." };
    }
    parsed.type = source.type;
  }

  return parsed;
};

module.exports = {
  EVENT_TYPES,
  OUTCOMES,
  RETENTION_DAYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  buildEvent,
  recordEvent,
  parseAuditQuery,
};

// Reference List:
// OWASP Foundation, 2026. Logging Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> [Accessed 7 November 2026].
