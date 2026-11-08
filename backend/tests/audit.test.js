const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EVENT_TYPES,
  OUTCOMES,
  RETENTION_DAYS,
  buildEvent,
  recordEvent,
  parseAuditQuery,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} = require("../utils/audit.js");
const AuditEvent = require("../models/auditEventModel.js");

// A stand in for the Express request, with the two things the audit helper reads
const fakeRequest = (ip, agent) => ({
  ip,
  get: (name) => {
    if (name === "user-agent") return agent;
    return undefined;
  },
});

test("an event holds the type, outcome, account, detail, address and browser", () => {
  const event = buildEvent({
    type: "login",
    outcome: "failure",
    userId: "64b7f0c2e1a4c2d3f4a5b6c7",
    detail: "wrong password",
    req: fakeRequest("::1", "Mozilla/5.0 Test"),
  });
  assert.deepEqual(event, {
    type: "login",
    outcome: "failure",
    userId: "64b7f0c2e1a4c2d3f4a5b6c7",
    detail: "wrong password",
    ip: "::1",
    userAgent: "Mozilla/5.0 Test",
  });
});

test("an event with no account or request still builds, such as a login for an unknown email", () => {
  assert.deepEqual(buildEvent({ type: "login", outcome: "failure", detail: "unknown email" }), {
    type: "login",
    outcome: "failure",
    detail: "unknown email",
  });
});

test("an unknown type or outcome is refused", () => {
  assert.equal(buildEvent({ type: "delete_everything", outcome: "success" }), null);
  assert.equal(buildEvent({ type: "login", outcome: "maybe" }), null);
  assert.equal(buildEvent({ outcome: "success" }), null);
});

test("only the listed fields are copied, so nothing else from the caller is stored", () => {
  const event = buildEvent({
    type: "password_change",
    outcome: "success",
    password: "SuperSecret1!",
    email: "someone@example.com",
    token: "abc.def.ghi",
    req: { ...fakeRequest("10.0.0.5", "Agent"), body: { password: "SuperSecret1!" } },
  });
  assert.deepEqual(Object.keys(event).sort(), ["ip", "outcome", "type", "userAgent"]);
});

test("a very long browser string and detail are cut short", () => {
  const event = buildEvent({
    type: "login",
    outcome: "success",
    detail: "d".repeat(500),
    req: fakeRequest("::1", "a".repeat(1000)),
  });
  assert.equal(event.userAgent.length, 200);
  assert.equal(event.detail.length, 100);
});

test("every event type the controllers record is accepted by the model", () => {
  const typeValues = AuditEvent.schema.path("type").enumValues;
  assert.deepEqual([...typeValues], [...EVENT_TYPES]);
  assert.deepEqual([...AuditEvent.schema.path("outcome").enumValues], [...OUTCOMES]);
});

test("the model removes records after the retention period", () => {
  const ttlIndex = AuditEvent.schema.indexes().find(([fields]) => fields.createdAt === 1);
  assert.equal(ttlIndex[1].expireAfterSeconds, RETENTION_DAYS * 24 * 60 * 60);
});

test("recordEvent stores a valid event through the model", async () => {
  const stored = [];
  const model = { create: async (event) => stored.push(event) };
  const result = await recordEvent(
    { type: "register", outcome: "success", req: fakeRequest("::1", "A") },
    model
  );
  assert.equal(result, true);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].type, "register");
});

test("a database failure is swallowed so the login is never broken", async () => {
  const model = {
    create: async () => {
      throw new Error("database is down");
    },
  };
  const result = await recordEvent({ type: "login", outcome: "success" }, model);
  assert.equal(result, false);
});

test("an invalid event is skipped without touching the database", async () => {
  let calls = 0;
  const model = {
    create: async () => {
      calls += 1;
    },
  };
  assert.equal(await recordEvent({ type: "nonsense", outcome: "success" }, model), false);
  assert.equal(calls, 0);
});

test("an empty query uses the first page and the default page size", () => {
  assert.deepEqual(parseAuditQuery({}), { page: 1, limit: DEFAULT_PAGE_SIZE });
  assert.deepEqual(parseAuditQuery(undefined), { page: 1, limit: DEFAULT_PAGE_SIZE });
});

test("a valid page, page size and type are accepted", () => {
  assert.deepEqual(parseAuditQuery({ page: "3", limit: "50", type: "login" }), {
    page: 3,
    limit: 50,
    type: "login",
  });
  assert.equal(parseAuditQuery({ limit: String(MAX_PAGE_SIZE) }).limit, MAX_PAGE_SIZE);
});

test("a page or page size that is not a whole number in range is refused", () => {
  const bad = ["0", "-1", "1.5", "abc", "", " 2", "1e3", "9999999"];
  for (const value of bad) {
    assert.ok(parseAuditQuery({ page: value }).error, `page "${value}" should be refused`);
  }
  assert.ok(parseAuditQuery({ limit: "0" }).error);
  assert.ok(parseAuditQuery({ limit: String(MAX_PAGE_SIZE + 1) }).error);
});

test("a type that is not on the list, or is not text, is refused", () => {
  assert.ok(parseAuditQuery({ type: "drop_everything" }).error);
  assert.ok(parseAuditQuery({ type: "LOGIN" }).error);
  // A value that is an object or an array instead of plain text
  assert.ok(parseAuditQuery({ type: { $ne: "login" } }).error);
  assert.ok(parseAuditQuery({ type: ["login", "register"] }).error);
  assert.ok(parseAuditQuery({ page: ["1", "2"] }).error);
});
