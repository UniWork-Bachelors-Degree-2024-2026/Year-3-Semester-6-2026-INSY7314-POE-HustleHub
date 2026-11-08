const logger = require("../utils/logger.js");

// HTTP request logger middleware
// Intercepts every incoming HTTP request and logs method, URL, status code, latency, and client IP.
const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const userTag = req.user ? ` [User: ${req.user.username || req.user._id}]` : "";
    const logMessage = `${method} ${url} ${statusCode} (${duration}ms) - IP: ${ip}${userTag}`;

    if (statusCode >= 500) {
      logger.error(logMessage, "HTTP");
    } else if (statusCode >= 400) {
      logger.warn(logMessage, "HTTP");
    } else {
      logger.info(logMessage, "HTTP");
    }
  });

  next();
};

module.exports = httpLogger;

// Reference List:
// OWASP Foundation, 2026. Logging Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> [Accessed 18 October 2026].
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
