// Controller for the two OTP protected flows: registration and password reset
const bcrypt = require("bcryptjs");

const User = require("../models/userModel.js");
const Otp = require("../models/otpModel.js");
const { generateToken } = require("../utils/token.js");
const { clearFailedLogins } = require("../utils/lockout.js");
const { sendEmail } = require("../services/emailService.js");
const { renderOtpEmail } = require("../emails/otpEmail.js");
const logger = require("../utils/logger.js");
const { maskEmail } = require("../utils/maskEmail.js");
const { recordEvent } = require("../utils/audit.js");
const {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  generateCode,
  hashCode,
  codesMatch,
  secondsUntilResend,
} = require("../utils/otp.js");

const INVALID_CODE_MESSAGE = "That code is incorrect or has expired. Please request a new one.";
const ALLOWED_SELF_ROLES = ["client", "freelancer"];

// Creates a fresh code for the email and purpose, stores only its hash and returns the plain code.
const storeCode = async (email, purpose, extraFields = {}) => {
  const code = generateCode();
  // CodeQL recommends $eq for values that come from a request, so they are only ever compared as plain values (CodeQL, 2026d).
  await Otp.findOneAndUpdate(
    { email: { $eq: email }, purpose },
    {
      $set: {
        codeHash: hashCode(email, purpose, code),
        attempts: 0,
        lastSentAt: new Date(),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
        ...extraFields,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return code;
};

// Builds and sends the passcode email for the given purpose.
const emailCode = (to, purpose, code, username) => {
  const message = renderOtpEmail({ purpose, code, minutes: OTP_TTL_MINUTES, username });
  return sendEmail({ to, subject: message.subject, html: message.html, text: message.text });
};

// Checks a submitted code against the stored record and counts wrong guesses.
// Returns { record } on success or { status, message } when the code is rejected.
const checkCode = async (email, purpose, code) => {
  const record = await Otp.findOne({ email: { $eq: email }, purpose });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return { status: 400, message: INVALID_CODE_MESSAGE };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: record._id });
    return { status: 400, message: INVALID_CODE_MESSAGE };
  }

  if (!codesMatch(record.codeHash, email, purpose, code)) {
    const updated = await Otp.findOneAndUpdate(
      { _id: record._id },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    // The record is destroyed on the final wrong guess so the code cannot be brute forced
    if (updated && updated.attempts >= OTP_MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
    }
    return { status: 400, message: INVALID_CODE_MESSAGE };
  }

  return { record };
};

/**
 * Step one of registration: validates the details and emails a code, no account exists yet
 * ROUTE -> POST /api/auth/register
 * ACCESS -> Public
 */
const startRegistration = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    // Only client or freelancer can be chosen, anything else becomes client
    let assignedRole = "client";
    if (ALLOWED_SELF_ROLES.includes(role)) {
      assignedRole = role;
    }

    const userExists = await User.findOne({ email: { $eq: email } });
    if (userExists) {
      logger.warn(
        `Registration rejected: User already exists with email "${maskEmail(email)}"`,
        "AUTH"
      );
      return res.status(400).json({ message: "User already exists with that email address." });
    }

    // Per-account limit on how often a code can be requested (OWASP, 2026d).
    const pending = await Otp.findOne({ email: { $eq: email }, purpose: "register" });
    if (pending) {
      const wait = secondsUntilResend(pending.lastSentAt);
      if (wait > 0) {
        logger.warn(
          `Registration code throttled: ${maskEmail(email)} must wait ${wait} seconds`,
          "AUTH"
        );
        return res.status(429).json({
          message: `Please wait ${wait} seconds before requesting another code.`,
          retryAfterSeconds: wait,
        });
      }
    }

    // The password is hashed straight away so the plain text is never stored, even temporarily
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const code = await storeCode(email, "register", { username, passwordHash, role: assignedRole });

    try {
      await emailCode(email, "register", code, username);
    } catch (mailError) {
      logger.error(
        `Registration email dispatch failed for ${maskEmail(email)}: ${mailError.message}`,
        "AUTH",
        mailError
      );
      await Otp.deleteOne({ email: { $eq: email }, purpose: "register" });
      return res
        .status(503)
        .json({ message: "We could not send the verification email. Please try again shortly." });
    }

    logger.info(
      `Registration code generated and dispatched to ${maskEmail(email)} (Role requested: ${assignedRole})`,
      "AUTH"
    );

    return res.status(200).json({
      message: "We have sent a verification code to your email address.",
      email,
      expiresInMinutes: OTP_TTL_MINUTES,
      resendAfterSeconds: OTP_RESEND_SECONDS,
    });
  } catch (error) {
    logger.error(`Start registration error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error during registration." });
  }
};

/**
 * Step two of registration: confirms the code, creates the account and signs the user in
 * ROUTE -> POST /api/auth/register/verify
 * ACCESS -> Public
 */
const verifyRegistration = async (req, res) => {
  try {
    const { email, code } = req.body;

    const result = await checkCode(email, "register", code);
    if (!result.record) {
      logger.warn(
        `Registration verification failed for ${maskEmail(email)}: ${result.message}`,
        "AUTH"
      );
      return res.status(result.status).json({ message: result.message });
    }
    const pending = result.record;

    const userExists = await User.findOne({ email: { $eq: email } });
    if (userExists) {
      await Otp.deleteOne({ _id: pending._id });
      logger.warn(
        `Registration verification collision: user already exists for ${maskEmail(email)}`,
        "AUTH"
      );
      return res.status(400).json({ message: "User already exists with that email address." });
    }

    // The stored password is already hashed, so the model's pre-save hook is told to leave it alone
    const user = new User({
      username: pending.username,
      email,
      password: pending.passwordHash,
      role: pending.role,
    });
    user.$locals.passwordIsHashed = true;
    await user.save();

    // A code can only be used once (OWASP, 2026d).
    await Otp.deleteOne({ _id: pending._id });

    logger.info(
      `User registered and verified successfully: ${maskEmail(user.email)} (Role: ${user.role}, ID: ${user._id})`,
      "AUTH"
    );
    await recordEvent({ type: "register", outcome: "success", userId: user._id, req });

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    logger.error(`Verify registration error: ${error.message}`, "AUTH", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists with that email address." });
    }
    return res.status(500).json({ message: "Server error during registration." });
  }
};

/**
 * Sends a new registration code for a sign up that is waiting for confirmation
 * ROUTE -> POST /api/auth/register/resend
 * ACCESS -> Public
 */
const resendRegistrationCode = async (req, res) => {
  try {
    const { email } = req.body;

    const pending = await Otp.findOne({ email: { $eq: email }, purpose: "register" });
    if (!pending) {
      logger.warn(
        `Resend code rejected: No pending registration found for ${maskEmail(email)}`,
        "AUTH"
      );
      return res
        .status(400)
        .json({ message: "There is no sign up waiting for that email. Please register again." });
    }

    const wait = secondsUntilResend(pending.lastSentAt);
    if (wait > 0) {
      logger.warn(`Resend code throttled for ${maskEmail(email)}: ${wait}s remaining`, "AUTH");
      return res.status(429).json({
        message: `Please wait ${wait} seconds before requesting another code.`,
        retryAfterSeconds: wait,
      });
    }

    const code = await storeCode(email, "register");

    try {
      await emailCode(email, "register", code, pending.username);
    } catch (mailError) {
      logger.error(
        `Registration resend email failed for ${maskEmail(email)}: ${mailError.message}`,
        "AUTH",
        mailError
      );
      return res
        .status(503)
        .json({ message: "We could not send the verification email. Please try again shortly." });
    }

    logger.info(`Registration verification code resent to ${maskEmail(email)}`, "AUTH");

    return res.status(200).json({
      message: "We have sent a new verification code to your email address.",
      email,
      expiresInMinutes: OTP_TTL_MINUTES,
      resendAfterSeconds: OTP_RESEND_SECONDS,
    });
  } catch (error) {
    logger.error(`Resend registration code error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error while sending the code." });
  }
};

/**
 * Emails a password reset code, always answering the same way so accounts cannot be discovered
 * ROUTE -> POST /api/auth/password/forgot
 * ACCESS -> Public
 */
const forgotPassword = async (req, res) => {
  // The same message is returned whether or not the account exists (OWASP, 2026d).
  const response = {
    message: "If an account exists for that email address, we have sent a reset code to it.",
    expiresInMinutes: OTP_TTL_MINUTES,
    resendAfterSeconds: OTP_RESEND_SECONDS,
  };

  try {
    const { email } = req.body;

    logger.info(`Password reset requested for email "${maskEmail(email)}"`, "AUTH");

    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      return res.status(200).json(response);
    }

    // Requests inside the cooldown are skipped quietly, the reply stays identical
    const existing = await Otp.findOne({ email: { $eq: email }, purpose: "reset" });
    if (existing && secondsUntilResend(existing.lastSentAt) > 0) {
      return res.status(200).json(response);
    }

    const code = await storeCode(email, "reset");

    try {
      await emailCode(email, "reset", code, user.username);
    } catch (mailError) {
      logger.error(
        `Reset email dispatch failed for ${maskEmail(email)}: ${mailError.message}`,
        "AUTH",
        mailError
      );
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`, "AUTH", error);
    return res.status(200).json(response);
  }
};

/**
 * Confirms the reset code and saves the new password, the user then logs in as normal
 * ROUTE -> POST /api/auth/password/reset
 * ACCESS -> Public
 */
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const result = await checkCode(email, "reset", code);
    if (!result.record) {
      logger.warn(
        `Password reset failed: Invalid or expired code attempt for ${maskEmail(email)}`,
        "AUTH"
      );
      return res.status(result.status).json({ message: result.message });
    }

    const user = await User.findOne({ email: { $eq: email } });
    if (!user) {
      await Otp.deleteOne({ _id: result.record._id });
      logger.warn(`Password reset failed: User not found for ${maskEmail(email)}`, "AUTH");
      return res.status(400).json({ message: INVALID_CODE_MESSAGE });
    }

    // The pre-save hook hashes the new password, and the timestamp retires every older token (OWASP, 2026d).
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Proving control of the inbox also lifts any lockout from earlier failed logins
    await clearFailedLogins(user);

    await Otp.deleteOne({ _id: result.record._id });

    logger.info(
      `Password reset successfully completed for user ${maskEmail(user.email)}. Previous sessions invalidated.`,
      "AUTH"
    );
    await recordEvent({ type: "password_reset", outcome: "success", userId: user._id, req });

    // The user is not logged in automatically after a reset (OWASP, 2026d).
    return res
      .status(200)
      .json({ message: "Your password has been updated. Please log in with your new password." });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error while resetting the password." });
  }
};

module.exports = {
  INVALID_CODE_MESSAGE,
  storeCode,
  emailCode,
  checkCode,
  startRegistration,
  verifyRegistration,
  resendRegistrationCode,
  forgotPassword,
  resetPassword,
};

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
// OWASP, 2026d. Forgot Password Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html> [Accessed 10 October 2026].
