// Runs the Postman collection with Newman against throwaway API servers and throwaway test data.
// Usage: npm test (inside Postman_Testing). Everything it creates is removed again afterwards.
const { spawn } = require("child_process");
const crypto = require("crypto");
const https = require("https");
const path = require("path");
const fs = require("fs");

const newman = require("newman");

const backendDir = path.join(__dirname, "..", "backend");
require(path.join(backendDir, "node_modules", "dotenv")).config({ path: path.join(backendDir, ".env"), quiet: true });

const mongoose = require(path.join(backendDir, "node_modules", "mongoose"));
const bcrypt = require(path.join(backendDir, "node_modules", "bcryptjs"));
const jwt = require(path.join(backendDir, "node_modules", "jsonwebtoken"));
const User = require(path.join(backendDir, "models", "userModel.js"));
const Otp = require(path.join(backendDir, "models", "otpModel.js"));
const Gig = require(path.join(backendDir, "models", "gigModel.js"));
const Booking = require(path.join(backendDir, "models", "bookingModel.js"));
const Transaction = require(path.join(backendDir, "models", "transactionModel.js"));
const Profile = require(path.join(backendDir, "models", "profileModel.js"));
const { generateCode, hashCode, OTP_TTL_MINUTES } = require(path.join(backendDir, "utils", "otp.js"));

const MAIN_PORT = 3098;
const LIMITED_PORT = 3097;

// The collection logs in as this client, so it is created when it does not already exist.
const COLLECTION_CLIENT = { email: "max@example.com", password: "SecurePassword123!", username: "max" };

// A fresh id and password per run, so nothing about the extra test accounts is ever committed.
const runId = crypto.randomBytes(4).toString("hex");
const randomPassword = () => `Aa1!${crypto.randomBytes(12).toString("base64url")}`;
const passwords = { main: randomPassword(), changed: randomPassword(), reset: randomPassword(), newcomer: randomPassword() };

const emailFor = (name) => `nm${runId}.${name}@hustlehub.test`;
const accounts = [
  { key: "client2", username: "NM Client Two", role: "client" },
  { key: "freelancer2", username: "NM Freelancer Two", role: "freelancer" },
  { key: "admin", username: "NM Admin", role: "admin" },
  { key: "pwuser", username: "NM Password User", role: "client" },
  { key: "resetuser", username: "NM Reset User", role: "client" },
];
const runEmails = [...accounts.map((account) => emailFor(account.key)), emailFor("newcomer")];

const startedAt = new Date();
let createdCollectionClient = false;
const children = [];

// Starts the API as a child process with its own port and limits, using the console mail provider.
const startServer = (port, limits) => {
  const child = spawn(process.execPath, ["app.js"], {
    cwd: backendDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: "test", EMAIL_PROVIDER: "console", ...limits },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  children.push(child);
};

// The servers use the certificate in the repository root, so its CA is the only one these requests need to trust.
// https.get accepts the ca option (Node.js, 2026a), which overrides the trusted certificates (Node.js, 2026b).
const caFile = path.join(__dirname, "..", "ca.crt");
const trustedCa = fs.readFileSync(caFile);

// Polls the health endpoint until the server answers, checking the certificate against that CA.
const waitForServer = (port) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = () => {
      const request = https.get({ host: "localhost", port, path: "/api/health", ca: trustedCa }, (response) => {
        response.resume();
        if (response.statusCode === 200) return resolve();
        retry();
      });
      request.on("error", retry);
    };
    const retry = () => {
      if (Date.now() - started > 30000) return reject(new Error(`API on port ${port} did not start.`));
      setTimeout(attempt, 400);
    };
    attempt();
  });

// Creates the extra accounts and the one time code fixtures the new requests need.
const seed = async () => {
  const existing = await User.findOne({ email: COLLECTION_CLIENT.email });
  if (!existing) {
    await User.create({ ...COLLECTION_CLIENT, role: "client" });
    createdCollectionClient = true;
  }

  for (const account of accounts) {
    await User.create({ username: account.username, email: emailFor(account.key), password: passwords.main, role: account.role });
  }

  // A pending sign up with a code we know, so the collection can confirm a real registration
  const registerCode = generateCode();
  const newcomerEmail = emailFor("newcomer");
  await Otp.create({
    email: newcomerEmail,
    purpose: "register",
    codeHash: hashCode(newcomerEmail, "register", registerCode),
    username: "NM Newcomer",
    passwordHash: await bcrypt.hash(passwords.newcomer, 10),
    role: "freelancer",
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  // A pending password reset with a code we know
  const resetCode = generateCode();
  const resetEmail = emailFor("resetuser");
  await Otp.create({
    email: resetEmail,
    purpose: "reset",
    codeHash: hashCode(resetEmail, "reset", resetCode),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  // Tokens issued an hour ago, so a later password change can retire them without waiting
  const agedToken = async (key) => {
    const user = await User.findOne({ email: emailFor(key) });
    const issuedAt = Math.floor(Date.now() / 1000) - 3600;
    return jwt.sign({ id: user._id, role: user.role, iat: issuedAt }, process.env.JWT_SECRET, { expiresIn: "1d" });
  };

  return {
    registerCode,
    resetCode,
    agedPwToken: await agedToken("pwuser"),
    agedResetToken: await agedToken("resetuser"),
    adminToken: await agedToken("admin"),
    freelancer2Token: await agedToken("freelancer2"),
  };
};

// Removes everything the run created, whether it passed or failed.
const cleanup = async () => {
  const emails = [...runEmails];
  if (createdCollectionClient) emails.push(COLLECTION_CLIENT.email);

  const users = await User.find({ email: { $in: emails } }).select("_id");
  const ids = users.map((user) => user._id);

  // Bookings and gigs for the run's freelancer include the ones made by the collection's own client
  await Transaction.deleteMany({ $or: [{ clientId: { $in: ids } }, { freelancerId: { $in: ids } }] });
  await Booking.deleteMany({ $or: [{ client: { $in: ids } }, { freelancer: { $in: ids } }] });
  await Gig.deleteMany({ freelancer: { $in: ids } });
  await Profile.deleteMany({ user: { $in: ids } });
  await Otp.deleteMany({ email: { $in: runEmails } });
  // The collection's own registration request creates pending codes for random addresses
  await Otp.deleteMany({ purpose: "register", username: "freelancer_user", createdAt: { $gte: startedAt } });
  await User.deleteMany({ _id: { $in: ids } });
};

// Points every request at the test server, the file on disk keeps its original localhost:3000 addresses.
// Requests store the port separately from the address text, so both are changed.
const loadCollection = () => {
  const text = fs.readFileSync(path.join(__dirname, "INSY7314.postman_collection"), "utf8");
  const collection = JSON.parse(text.replaceAll("https://localhost:3000", `https://localhost:${MAIN_PORT}`));

  const repoint = (items) => {
    for (const item of items) {
      if (item.item) {
        repoint(item.item);
      } else if (item.request && item.request.url && item.request.url.port === "3000") {
        item.request.url.port = String(MAIN_PORT);
      }
    }
  };
  repoint(collection.item);
  return collection;
};

const runCollection = (fixtures) =>
  new Promise((resolve, reject) => {
    // The cli reporter prints the results to the terminal and writes no files (Newman, 2026).
    newman.run(
      {
        collection: loadCollection(),
        envVar: [
          { key: "limited_url", value: `https://localhost:${LIMITED_PORT}/api` },
          { key: "password", value: passwords.main },
          { key: "changed_password", value: passwords.changed },
          { key: "reset_password", value: passwords.reset },
          { key: "client2_email", value: emailFor("client2") },
          { key: "resetuser_email", value: emailFor("resetuser") },
          { key: "newcomer_email", value: emailFor("newcomer") },
          { key: "register_code", value: fixtures.registerCode },
          { key: "reset_code", value: fixtures.resetCode },
          { key: "aged_pw_token", value: fixtures.agedPwToken },
          { key: "aged_reset_token", value: fixtures.agedResetToken },
          { key: "admin_token", value: fixtures.adminToken },
          { key: "freelancer2_token", value: fixtures.freelancer2Token },
        ],
        reporters: ["cli"],
        // Newman only talks to the throwaway servers started above on localhost (Newman, 2026).
        insecure: true,
        timeoutRequest: 20000,
      },
      (error, summary) => {
        if (error) return reject(error);
        resolve(summary);
      }
    );
  });

const main = async () => {
  await mongoose.connect(process.env.CONN_STRING);

  let exitCode = 1;
  try {
    // Normal limits for the main run, tiny limits for the rate limiting requests
    startServer(MAIN_PORT, {
      API_RATE_LIMIT_MAX: "5000",
      AUTH_RATE_LIMIT_MAX: "500",
      OTP_RATE_LIMIT_MAX: "500",
      ACCOUNT_RATE_LIMIT_MAX: "500",
      BOOKING_RATE_LIMIT_MAX: "500",
    });
    startServer(LIMITED_PORT, { API_RATE_LIMIT_MAX: "5000", AUTH_RATE_LIMIT_MAX: "1" });
    await Promise.all([waitForServer(MAIN_PORT), waitForServer(LIMITED_PORT)]);

    const fixtures = await seed();
    const summary = await runCollection(fixtures);

    console.log(`\nAssertions: ${summary.run.stats.assertions.total}, failed: ${summary.run.stats.assertions.failed}`);
    if (summary.run.failures.length === 0) exitCode = 0;
  } catch (error) {
    console.error("API test run failed:", error.message);
  } finally {
    await cleanup().catch((error) => console.error("Cleanup failed:", error.message));
    children.forEach((child) => child.kill());
    await mongoose.disconnect();
  }
  process.exit(exitCode);
};

main();

// Reference List:
// Newman, 2026. Newman: the command line collection runner for Postman. [online] Available at: <https://github.com/postmanlabs/newman/blob/develop/README.md> [Accessed 10 October 2026].
// Node.js, 2026a. HTTPS: https.request(options[, callback]). [online] Available at: <https://nodejs.org/api/https.html> [Accessed 7 November 2026].
// Node.js, 2026b. TLS (SSL): tls.createSecureContext([options]). [online] Available at: <https://nodejs.org/api/tls.html> [Accessed 7 November 2026].
