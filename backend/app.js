require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Overall server bootstrapping structure (requiring middleware/routes,
// creating the Express instance, applying security middleware, and
// starting the HTTPS server after the database connects) adapted from
// rudderz243 (2026).

const database = require("./middleware/dbMiddleware.js");
const setupSecurity = require("./middleware/securityMiddleware.js");
const { sanitizeRequest } = require("./middleware/sanitizeMiddleware.js");
const { apiLimiter } = require("./middleware/rateLimitMiddleware.js");
const logger = require("./utils/logger.js");
const httpLogger = require("./middleware/loggerMiddleware.js");
const authRoutes = require("./routes/authRoutes.js");
const gigRoutes = require("./routes/gigRoutes.js");
const bookingRoutes = require("./routes/bookingRoutes.js");
const transactionRoutes = require("./routes/transactionRoutes.js");
const cspRoutes = require("./routes/cspRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");

// Fail fast if required secrets are missing, rather than failing later
// with a confusing error from Mongoose or JsonWebToken (JWT).
const requiredEnvVars = ["CONN_STRING", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  logger.error(
    `Missing required environment variable(s): ${missingEnvVars.join(", ")}. Check your .env file.`,
    "SERVER"
  );
  process.exit(1);
}

const app = express();

// Automatically log every incoming HTTP request that passes through the backend (rudderz243, 2026).
app.use(httpLogger);

// Apply Security Middleware (Helmet headers and CORS) before any parsing
setupSecurity(app);

// Overall request ceiling applied to every API route, before any body is parsed
app.use("/api", apiLimiter);

// The profile photo is sent as a data URL, so only this one route accepts a larger body
app.put("/api/users/me/profile", express.json({ limit: "512kb" }));

// Middleware: JSON Body Parser, bodies over 10kb are rejected
app.use(
  express.json({
    limit: "10kb",
    type: ["application/json", "application/csp-report", "application/reports+json"],
  })
);

// Strip HTML and Mongo operator keys from the body, query and params
app.use(sanitizeRequest);

// Mount Authentication Endpoints (rudderz243, 2026).
app.use("/api/auth", authRoutes);

// Mount Gig Marketplace Endpoints
app.use("/api/gigs", gigRoutes);

// Mount Booking Management Endpoints
app.use("/api/bookings", bookingRoutes);

// Mount Simulated Transactions & Income Endpoints
app.use("/api/transactions", transactionRoutes);

// Mount Member Profile Endpoints
app.use("/api/users", userRoutes);

// Admin only routes, such as the audit trail
app.use("/api/admin", adminRoutes);

// Mount the endpoint that receives CSP violation reports from browsers
app.use("/api/csp-report", cspRoutes);

// Health check endpoint to verify backend connection
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API up and running!" });
});

// 404 handler: catches any request to a route that doesn't exist
app.use((req, res) => {
  logger.warn(
    `The requested resource was not found: ${req.method} ${req.originalUrl || req.url}`,
    "HTTP"
  );
  res.status(404).json({ message: "The requested resource was not found." });
});

// Centralised error handler: catches any error not already handled by a
// controller's own try/catch. Must be defined last, and must have all
// four parameters (err, req, res, next) for Express to recognise it as
// an error handler rather than regular middleware.
// The unused fourth parameter is named _next, Express still needs all four to treat this as an error handler.
app.use((err, req, res, _next) => {
  // Malformed JSON and oversized bodies get a client error instead of a 500
  if (err.type === "entity.parse.failed") {
    logger.warn(
      `Malformed JSON payload rejected on ${req.method} ${req.originalUrl || req.url}`,
      "HTTP"
    );
    return res.status(400).json({ success: false, message: "Request body is not valid JSON." });
  }
  if (err.type === "entity.too.large") {
    logger.warn(`Oversized body rejected on ${req.method} ${req.originalUrl || req.url}`, "HTTP");
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }
  logger.error(`Unhandled error caught: ${err.message}`, "SERVER", err);
  res.status(500).json({ message: "An unexpected server error occurred." });
});

// Process-level crash and shutdown handlers (rudderz243, 2026).
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, "CRASH", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`, "CRASH");
});

process.on("SIGINT", () => {
  logger.info("Server shutting down (got ctrl+c in terminal)", "SERVER");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Server shutting down (termination signal received)", "SERVER");
  process.exit(0);
});

// Configure SSL options for local HTTPS development. In production, SSL is typically handled by a reverse proxy or load balancer (rudderz243, 2026).
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "../cert.key")),
  cert: fs.readFileSync(path.join(__dirname, "../cert.crt")),
  ca: fs.readFileSync(path.join(__dirname, "../ca.crt")),
};

const PORT = process.env.PORT || 3000;

// Connect to the database, then start the HTTPS server
database.start().then(() => {
  https.createServer(sslOptions, app).listen(PORT, () => {
    logger.info(
      `Authentication & Freelance Marketplace API running securely over HTTPS on port ${PORT}`,
      "SERVER"
    );
  });
});

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
