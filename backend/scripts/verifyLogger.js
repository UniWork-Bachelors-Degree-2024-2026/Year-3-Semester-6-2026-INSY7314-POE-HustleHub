// Test script to verify logger functionality, file writing, error filtering, and formatting.
// Run with: npm run test:logger
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const logger = require("../utils/logger.js");

const runVerification = async () => {
  console.log("=== Testing HustleHub+ Logger System ===");

  // 1. Emit test logs with diverse contexts and metadata
  logger.info("System startup initiated", "SERVER");
  logger.info("User registered successfully: testuser@example.com (Role: client)", "AUTH");
  logger.warn("Rate limit warning triggered by IP: 127.0.0.1", "RATE_LIMIT");
  logger.info(
    "Booking created: ID 60d5ec49f1b2c82d881e4f11 for gig 'Web Dev' (Price: R1500)",
    "BOOKINGS"
  );
  logger.info("Simulated transaction generated: Ref TXN-TEST-1234 (Amount: R1500)", "TRANSACTIONS");
  logger.warn("Unauthorized resource access blocked", "SECURITY", {
    route: "/api/gigs/secret",
    user: "guest",
  });
  logger.error(
    "Simulated database failure test",
    "DATABASE",
    new Error("Connection timeout after 5000ms")
  );

  // Give fs write stream a moment
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 2. Check that logs directory exists
  const logsDir = logger.LOGS_DIR;
  if (!fs.existsSync(logsDir)) {
    throw new Error(`Logs directory does not exist at ${logsDir}`);
  }
  console.log("✔ Logs directory verified at:", logsDir);

  // 3. Check combined and error log files
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const combinedLogPath = path.join(logsDir, `${dateStr}-combined.log`);
  const errorLogPath = path.join(logsDir, `${dateStr}-error.log`);

  if (!fs.existsSync(combinedLogPath)) {
    throw new Error(`Combined log file not found at ${combinedLogPath}`);
  }
  console.log("✔ Combined log file created:", combinedLogPath);

  if (!fs.existsSync(errorLogPath)) {
    throw new Error(`Error log file not found at ${errorLogPath}`);
  }
  console.log("✔ Error log file created:", errorLogPath);

  // 4. Verify content filtering
  const combinedContent = fs.readFileSync(combinedLogPath, "utf-8");
  const errorContent = fs.readFileSync(errorLogPath, "utf-8");

  if (!combinedContent.includes("[INFO] [AUTH]: User registered successfully")) {
    throw new Error("Combined log missing info auth entry");
  }
  if (!combinedContent.includes("[BOOKINGS]: Booking created")) {
    throw new Error("Combined log missing bookings entry");
  }
  if (!combinedContent.includes("[TRANSACTIONS]: Simulated transaction generated")) {
    throw new Error("Combined log missing transactions entry");
  }
  if (!combinedContent.includes("[ERROR] [DATABASE]: Simulated database failure test")) {
    throw new Error("Combined log missing error database entry");
  }

  // Error log MUST contain the error entry and must NOT contain info entries
  if (!errorContent.includes("[ERROR] [DATABASE]: Simulated database failure test")) {
    throw new Error("Error log missing database failure error entry");
  }
  if (errorContent.includes("[INFO]")) {
    throw new Error("Error log improperly contains INFO level logs!");
  }

  // 5. Cloud logging verification
  const rawToken = (
    process.env.BETTERSTACK_SOURCE_TOKEN ||
    process.env.BETTERSTACK_SOURCE_TO ||
    process.env.LOGTAIL_SOURCE_TOKEN ||
    process.env.LOGTAIL_TOKEN ||
    ""
  ).trim();

  const hasRealToken =
    rawToken && !rawToken.includes("your_betterstack") && !rawToken.includes("placeholder");

  if (hasRealToken) {
    const rawHost = (
      process.env.BETTERSTACK_INGESTING_HOST ||
      process.env.BETTERSTACK_HOST ||
      "in.logs.betterstack.com"
    ).trim();
    const hostname = rawHost.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

    console.log("✔ Better Stack source token detected in .env");
    console.log(`  → Validating connection to Better Stack (https://${hostname}) ...`);

    const https = require("https");
    const testPayload = JSON.stringify({
      dt: new Date().toISOString(),
      level: "info",
      message: "[SERVER]: System startup verified from test script",
      context: "SERVER",
      service: "hustlehub-api",
      environment: process.env.NODE_ENV || "development",
    });

    const result = await new Promise((resolve) => {
      const req = https.request(
        {
          hostname,
          port: 443,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${rawToken}`,
            "Content-Length": Buffer.byteLength(testPayload),
          },
          timeout: 6000,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            resolve({ statusCode: res.statusCode, body });
          });
        }
      );

      req.on("error", (err) => resolve({ statusCode: null, err: err.message }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ statusCode: null, err: "Connection timeout after 6000ms" });
      });
      req.write(testPayload);
      req.end();
    });

    if (result.statusCode === 200 || result.statusCode === 202) {
      console.log(
        `✔ Better Stack Cloud Ingestion: SUCCESS (HTTP ${result.statusCode} - Logs accepted!)`
      );
      console.log("  → Check your Better Stack dashboard: https://telemetry.betterstack.com");
    } else if (result.statusCode === 401) {
      console.log(`✖ Better Stack returned HTTP 401 Unauthorized for token: "${rawToken}"`);
      console.log("  → Better Stack rejected this token. Common reasons to check:");
      console.log(
        "     1. Did you click 'Save' / 'Create source' in the Better Stack browser tab?"
      );
      console.log(
        "     2. Ensure you copied the 'Source Token' (from Telemetry -> Sources -> (your source) -> Configure), NOT a personal Team API token from Settings."
      );
      console.log("     3. Check that no characters were cut off when copying.");
    } else {
      console.log(`✖ Better Stack returned HTTP ${result.statusCode}:`, result.body || result.err);
    }
  } else {
    console.log(
      "ℹ Better Stack cloud logging: READY (Set BETTERSTACK_SOURCE_TOKEN in .env to stream to cloud)"
    );
  }

  console.log("✔ All local log file checks passed successfully!");
  console.log("=== HustleHub+ Logger Verification Complete ===");
};

runVerification().catch((err) => {
  console.error("Logger verification failed:", err);
  process.exit(1);
});
