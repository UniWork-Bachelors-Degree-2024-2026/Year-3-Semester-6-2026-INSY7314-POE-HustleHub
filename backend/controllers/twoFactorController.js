// Own security feature: optional two-factor login with a code emailed to the account owner.
// A stolen or guessed password alone is no longer enough to open a protected account (OWASP Foundation, [s.a.]a).
const User = require("../models/userModel.js");
const Otp = require("../models/otpModel.js");
const { generateToken } = require("../utils/token.js");
const logger = require("../utils/logger.js");
const { maskEmail } = require("../utils/maskEmail.js");
const { recordEvent } = require("../utils/audit.js");
const { OTP_TTL_MINUTES, OTP_RESEND_SECONDS, secondsUntilResend } = require("../utils/otp.js");
const { INVALID_CODE_MESSAGE, storeCode, emailCode, checkCode } = require("./otpController.js");

/**
 * Called by the login controller once the password is correct and the account has two-factor switched on.
 * Emails a login code (unless one was sent in the last minute) and returns the challenge for the client.
 * Returns { status, body }, the login controller sends it as the response.
 */
const sendLoginChallenge = async (user) => {
  const existing = await Otp.findOne({ email: user.email, purpose: "login" });

  // A code sent in the last minute is still valid, so repeated logins cannot be used to flood the inbox
  const wait = existing ? secondsUntilResend(existing.lastSentAt) : 0;
  if (wait === 0) {
    const code = await storeCode(user.email, "login");
    try {
      await emailCode(user.email, "login", code, user.username);
    } catch (mailError) {
      logger.error(
        `Login code email failed for ${maskEmail(user.email)}: ${mailError.message}`,
        "AUTH",
        mailError
      );
      await Otp.deleteOne({ email: user.email, purpose: "login" });
      return {
        status: 503,
        body: { message: "We could not send your login code. Please try again shortly." },
      };
    }
    logger.info(`Two-factor login code dispatched to ${maskEmail(user.email)}`, "SECURITY");
  }

  // No token is issued at this point, only the instruction to confirm the code
  return {
    status: 200,
    body: {
      twoFactorRequired: true,
      email: user.email,
      message: "We have sent a login code to your email address.",
      expiresInMinutes: OTP_TTL_MINUTES,
      resendAfterSeconds: OTP_RESEND_SECONDS,
    },
  };
};

/**
 * Second step of a two-factor login: confirms the emailed code and returns the session token
 * ROUTE -> POST /api/auth/login/2fa
 * ACCESS -> Public (rate limited, the code is single use and destroyed after 5 wrong guesses)
 */
const verifyLoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await checkCode(email, "login", code);
    if (!result.record) {
      logger.warn(
        `Two-factor login failed for ${maskEmail(email)}: invalid or expired code`,
        "SECURITY"
      );
      await recordEvent({
        type: "login_2fa",
        outcome: "failure",
        detail: "invalid or expired code",
        req,
      });
      return res.status(result.status).json({ message: result.message });
    }

    // CodeQL recommends $eq for values that come from a request, so they are only ever compared as plain values (CodeQL, 2026d).
    const user = await User.findOne({ email: { $eq: email } });
    // The code is single use, and it only counts while the account still has two-factor switched on
    await Otp.deleteOne({ _id: result.record._id });
    if (!user || !user.twoFactorEnabled) {
      logger.warn(
        `Two-factor login rejected for ${maskEmail(email)}: two-factor is not active`,
        "SECURITY"
      );
      return res.status(400).json({ message: INVALID_CODE_MESSAGE });
    }

    logger.info(
      `User logged in with two-factor successfully: ${maskEmail(user.email)} (Role: ${user.role}, ID: ${user._id})`,
      "AUTH"
    );
    await recordEvent({ type: "login_2fa", outcome: "success", userId: user._id, req });

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      twoFactorEnabled: true,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    logger.error(`Two-factor login error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error during login." });
  }
};

/**
 * Switches two-factor login on or off for the logged in member, after confirming their password
 * ROUTE -> PUT /api/auth/2fa
 * ACCESS -> Private (requires valid JWT)
 */
const setTwoFactor = async (req, res) => {
  try {
    const { enabled, password } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      logger.warn(`Two-factor change failed: User not found for ID ${req.user._id}`, "AUTH");
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // The password is asked for again so a stolen session alone cannot weaken the account (OWASP Foundation, [s.a.]a).
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn(
        `Two-factor change rejected: Incorrect password entered for user "${maskEmail(user.email)}"`,
        "SECURITY"
      );
      await recordEvent({
        type: "two_factor_change",
        outcome: "failure",
        userId: user._id,
        detail: "wrong password",
        req,
      });
      return res.status(400).json({ message: "Your current password is incorrect." });
    }

    user.twoFactorEnabled = enabled;
    await user.save();

    // A login code that is still waiting must not outlive the setting
    if (!enabled) {
      await Otp.deleteOne({ email: user.email, purpose: "login" });
    }

    logger.info(
      `Two-factor login ${enabled ? "enabled" : "disabled"} for user "${maskEmail(user.email)}"`,
      "SECURITY"
    );
    let change = "switched off";
    if (enabled) {
      change = "switched on";
    }
    await recordEvent({
      type: "two_factor_change",
      outcome: "success",
      userId: user._id,
      detail: change,
      req,
    });

    return res.status(200).json({
      message: enabled
        ? "Two-factor login is now switched on."
        : "Two-factor login is now switched off.",
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    logger.error(`Two-factor setting error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error while updating two-factor login." });
  }
};

module.exports = { sendLoginChallenge, verifyLoginCode, setTwoFactor };

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
// OWASP Foundation, [s.a.]a. Authentication Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> [Accessed 01 August 2026].
