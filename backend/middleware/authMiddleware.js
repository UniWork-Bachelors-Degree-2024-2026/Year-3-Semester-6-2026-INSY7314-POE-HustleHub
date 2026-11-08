const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const logger = require("../utils/logger.js");
const { maskEmail } = require("../utils/maskEmail.js");

// Middleware to validate JWT token (Fail-Close) (rudderz243, 2026).
const validateAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      if (!token) {
        logger.warn(
          `Auth rejected: Bearer token missing in header (${req.method} ${req.originalUrl || req.url})`,
          "SECURITY"
        );
        return res.status(401).json({ message: "Not authorized, token missing" });
      }

      // Verify token signature and expiration
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Query database and attach user (excluding password) to req.user
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        logger.warn(
          `Auth failure: User associated with token no longer exists (${req.method} ${req.originalUrl || req.url})`,
          "SECURITY"
        );
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // A token issued before the last password change is no longer accepted (OWASP, 2026d).
      if (user.passwordChangedAt) {
        const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (decoded.iat < changedAtSeconds) {
          logger.warn(
            `Auth rejected: Token revoked due to password change for ${maskEmail(user.email)} (${req.method} ${req.originalUrl || req.url})`,
            "SECURITY"
          );
          return res.status(401).json({ message: "Not authorized, please log in again" });
        }
      }

      req.user = user;
      return next();
    } catch (error) {
      logger.warn(
        `Auth failure: Invalid or expired token (${req.method} ${req.originalUrl || req.url}): ${error.message}`,
        "SECURITY"
      );
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // Return 401 for missing or malformed Authorization header
  logger.warn(
    `Auth rejected: Attempted access of protected route without token (${req.method} ${req.originalUrl || req.url})`,
    "SECURITY"
  );
  return res.status(401).json({ message: "Not authorized, no token provided" });
};

// Middleware to validate user role (rudderz243, 2026).
const validateRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const username = req.user ? req.user.username : "anonymous";
      const userRole = req.user ? req.user.role : "none";
      logger.warn(
        `Auth forbidden: User "${username}" (${userRole}) attempted to access role-restricted route [${roles.join(", ")}] (${req.method} ${req.originalUrl || req.url})`,
        "SECURITY"
      );
      return res.status(403).json({ message: "Access forbidden: insufficient permissions" });
    }
    next();
  };
};

module.exports = {
  validateAuth,
  validateRole,
};

// Reference List:
// OWASP, 2026d. Forgot Password Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html> [Accessed 10 October 2026].
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
