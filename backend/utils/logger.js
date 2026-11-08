// HustleHub+ Logger Utility
// Handles console output, daily file rotation in /logs, and Better Stack cloud logging.
const fs = require("fs");
const path = require("path");
const https = require("https");

// Path to local logs folder
const LOGS_DIR = path.join(__dirname, "..", "logs");

// Ensure the logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ANSI colors for clean terminal output
const colours = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

// Returns date string for log file names (YYYY-MM-DD)
const getDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Returns timestamp for log entries (YYYY-MM-DD HH:mm:ss)
const getTimestamp = () => {
  const now = new Date();
  const date = getDateString();
  const hours = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${date} ${hours}:${mins}:${seconds}`;
};

// Removes line breaks so a value typed by a user cannot start a fake log entry (CodeQL, 2026c).
const stripLineBreaks = (text) => String(text).replace(/\n|\r/g, "");

// Appends a line to a daily log file
const appendToFile = (fileName, logEntry) => {
  const filePath = path.join(LOGS_DIR, fileName);
  fs.appendFile(filePath, logEntry, (err) => {
    if (err) {
      console.error(`[LOGGER ERROR] Failed to write to ${fileName}:`, err.message);
    }
  });
};

/**
 * Cloud Logging Transport: Better Stack
 * --------------------------------------------------------
 * Sends logs to Better Stack over HTTPS.
 * Setup: add BETTERSTACK_SOURCE_TOKEN to backend/.env
 * Get a free token at https://betterstack.com
 *
 * Fully non-blocking and fail-safe: errors never crash or delay requests.
 */
const sendToBetterStack = (level, message, context, metaObj) => {
  const token = (
    process.env.BETTERSTACK_SOURCE_TOKEN ||
    process.env.BETTERSTACK_SOURCE_TO ||
    process.env.LOGTAIL_SOURCE_TOKEN ||
    process.env.LOGTAIL_TOKEN ||
    process.env.CLOUD_LOGGING_TOKEN ||
    ""
  ).trim();

  // Skip if token is missing or left as the placeholder string
  if (!token || token.includes("your_betterstack") || token.includes("placeholder")) {
    return;
  }

  try {
    const payload = JSON.stringify({
      dt: new Date().toISOString(),
      level: level.toLowerCase(),
      message: `[${context}] ${message}`,
      context,
      service: "hustlehub-api",
      environment: process.env.NODE_ENV || "development",
      ...(metaObj ? { meta: metaObj } : {}),
    });

    const rawHost = (
      process.env.BETTERSTACK_INGESTING_HOST ||
      process.env.BETTERSTACK_HOST ||
      "in.logs.betterstack.com"
    ).trim();
    const hostname = rawHost.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

    const options = {
      hostname,
      port: 443,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 4000,
    };

    const req = https.request(options, (res) => {
      res.resume(); // Free socket
    });

    req.on("error", () => {
      // Ignore network errors so cloud logging never interrupts requests
    });

    req.write(payload);
    req.end();
  } catch {
    // Fail-safe catch
  }
};

/**
 * Main logging function
 * @param {string} level - Severity level: "INFO", "WARN", "ERROR"
 * @param {string} message - Event description
 * @param {string} context - Subsystem (e.g. AUTH, BOOKINGS, TRANSACTIONS, SECURITY, DATABASE)
 * @param {Error|object|string|null} meta - Optional error or metadata
 */
const log = (level, message, context = "APP", meta = null) => {
  const safeMessage = stripLineBreaks(message);
  const timestamp = getTimestamp();
  const dateStr = getDateString();

  let metaStr = "";
  let metaObj = null;

  if (meta) {
    if (meta instanceof Error) {
      // Keep errors clean: exactly 2 lines total (log line + error name/message, no verbose stack dump)
      const errLine = meta.stack
        ? meta.stack.split("\n")[0].trim()
        : `${meta.name || "Error"}: ${meta.message}`;
      metaStr = `\n${stripLineBreaks(errLine)}`;
      metaObj = {
        name: meta.name,
        message: meta.message,
      };
    } else if (typeof meta === "object") {
      try {
        metaStr = ` ${JSON.stringify(meta)}`;
        metaObj = meta;
      } catch {
        metaStr = " [Unextractable Object]";
        metaObj = { error: "Unextractable Object" };
      }
    } else {
      metaStr = ` ${meta}`;
      metaObj = { details: String(meta) };
    }
  }

  // 1. Build log entry
  const fileEntry = `[${timestamp}] [${level}] [${context}]: ${safeMessage}${metaStr}\n`;

  // 2. Append to daily combined log
  appendToFile(`${dateStr}-combined.log`, fileEntry);

  // 3. If ERROR, also append to daily error log
  if (level === "ERROR") {
    appendToFile(`${dateStr}-error.log`, fileEntry);
  }

  // 4. Print coloured line to terminal
  let colour = colours.reset;
  if (level === "INFO") colour = colours.green;
  if (level === "WARN") colour = colours.yellow;
  if (level === "ERROR") colour = colours.red;

  console.log(
    `${colours.gray}[${timestamp}]${colours.reset} ${colour}[${level}]${colours.reset} ${colours.cyan}[${context}]${colours.reset}: ${safeMessage}${metaStr}`
  );

  // 5. Send to Better Stack cloud platform
  sendToBetterStack(level, safeMessage, context, metaObj);
};

const logger = {
  info: (message, context = "APP", meta = null) => log("INFO", message, context, meta),
  warn: (message, context = "APP", meta = null) => log("WARN", message, context, meta),
  error: (message, context = "APP", meta = null) => log("ERROR", message, context, meta),
  sendToBetterStack,
  stripLineBreaks,
  LOGS_DIR,
};

module.exports = logger;

// Reference List:
// Better Stack, 2026. Telemetry HTTP REST API Documentation. [online] Available at: <https://betterstack.com/docs/logs/http-rest-api/> [Accessed 18 October 2026].
// CodeQL, 2026c. Log injection. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-log-injection/> [Accessed 7 November 2026].
// OWASP Foundation, 2026. Logging Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> [Accessed 18 October 2026].
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
