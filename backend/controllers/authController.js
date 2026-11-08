// call in the userModel
const User = require("../models/userModel.js");
const logger = require("../utils/logger.js");
const { maskEmail } = require("../utils/maskEmail.js");
const { recordEvent } = require("../utils/audit.js");
const { generateToken } = require("../utils/token.js");
const {
  LOCKOUT_MINUTES,
  lockSecondsRemaining,
  recordFailedLogin,
  clearFailedLogins,
} = require("../utils/lockout.js");
const { sendLoginChallenge } = require("./twoFactorController.js");

// One message is used for every lockout response, so it never says more than it has to
const lockedResponse = (res, seconds) =>
  res.status(429).json({
    message: `Too many failed login attempts. Please try again in ${Math.max(1, Math.ceil(seconds / 60))} minutes.`,
    retryAfterSeconds: seconds,
  });

/**
 * Method to login user & return JWT token
 * ROUTE -> POST /api/auth/login
 * ACCESS -> Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required input
    if (!email || !password) {
      logger.warn("Login rejected: Missing email or password in request body", "AUTH");
      return res.status(400).json({
        message: "Please provide both email and password.",
      });
    }

    // Check if user exists
    // CodeQL recommends $eq for values that come from a request, so they are only ever compared as plain values (CodeQL, 2026d).
    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      logger.warn(
        `Login failed: Attempted login for non-existent email "${maskEmail(email)}"`,
        "AUTH"
      );
      await recordEvent({ type: "login", outcome: "failure", detail: "unknown email", req });
      return res.status(400).json({
        message: "Invalid credentials.",
      });
    }

    // Own security feature: a locked account refuses every attempt, even with the right password
    const lockedFor = lockSecondsRemaining(user);
    if (lockedFor > 0) {
      logger.warn(
        `Login blocked: Account "${maskEmail(email)}" is locked for another ${lockedFor} seconds`,
        "SECURITY"
      );
      await recordEvent({
        type: "login",
        outcome: "failure",
        userId: user._id,
        detail: "account locked",
        req,
      });
      return lockedResponse(res, lockedFor);
    }

    // Compare password hash (rudderz243, 2026).
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn(
        `Login failed: Incorrect password attempt for email "${maskEmail(email)}"`,
        "AUTH"
      );
      const outcome = await recordFailedLogin(user);
      await recordEvent({
        type: "login",
        outcome: "failure",
        userId: user._id,
        detail: "wrong password",
        req,
      });
      if (outcome.locked) {
        await recordEvent({
          type: "account_lockout",
          outcome: "failure",
          userId: user._id,
          detail: "too many failed logins",
          req,
        });
        logger.warn(
          `Account locked: "${maskEmail(email)}" reached the limit of failed logins, locked for ${LOCKOUT_MINUTES} minutes`,
          "SECURITY"
        );
        return lockedResponse(res, LOCKOUT_MINUTES * 60);
      }
      return res.status(400).json({
        message: "Invalid credentials.",
      });
    }

    // A correct password clears the earlier failures
    await clearFailedLogins(user);

    // Own security feature: with two-factor on, the password alone does not open a session
    if (user.twoFactorEnabled) {
      const challenge = await sendLoginChallenge(user);
      return res.status(challenge.status).json(challenge.body);
    }

    logger.info(
      `User logged in successfully: ${maskEmail(user.email)} (Role: ${user.role}, ID: ${user._id})`,
      "AUTH"
    );
    await recordEvent({ type: "login", outcome: "success", userId: user._id, req });

    // Return user info and token
    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      twoFactorEnabled: false,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

// Method to return the currently authenticated user's profile
// ROUTE -> GET /api/auth/profile
// ACCESS -> Private (requires valid JWT)
const getProfile = async (req, res) => {
  try {
    // req.user was attached by the validateAuth middleware after verifying the JWT
    return res.status(200).json({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      twoFactorEnabled: Boolean(req.user.twoFactorEnabled),
    });
  } catch (error) {
    logger.error(`Profile fetch error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error while fetching profile." });
  }
};

module.exports = { generateToken, loginUser, getProfile };

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
