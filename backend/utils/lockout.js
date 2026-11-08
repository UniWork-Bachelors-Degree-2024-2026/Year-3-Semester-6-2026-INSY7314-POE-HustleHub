// Own security feature: per-account lockout after repeated failed logins.
// The IP based rate limiter slows one machine down, while this protects a single account from
// a slow attack spread over many machines (OWASP Foundation, [s.a.]a).
const User = require("../models/userModel.js");

// Both values can be tuned from .env
const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const MAX_FAILED_LOGINS = numberFromEnv("LOCKOUT_MAX_ATTEMPTS", 5);
const LOCKOUT_MINUTES = numberFromEnv("LOCKOUT_MINUTES", 15);

// Seconds left on an active lock, or 0 when the account is not locked.
const lockSecondsRemaining = (user) => {
  if (!user.lockUntil) return 0;
  return Math.max(0, Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000));
};

// Counts one wrong password and starts the lock when the limit is reached.
// The counter is increased with an atomic update so parallel guesses cannot skip the limit.
// Returns { locked, attempts }.
const recordFailedLogin = async (user) => {
  const updated = await User.findOneAndUpdate(
    { _id: user._id },
    { $inc: { failedLoginAttempts: 1 } },
    { new: true }
  );
  const attempts = updated ? updated.failedLoginAttempts : 0;

  if (attempts >= MAX_FAILED_LOGINS) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lockUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
          failedLoginAttempts: 0,
        },
      }
    );
    return { locked: true, attempts };
  }

  return { locked: false, attempts };
};

// Forgets earlier failures after a successful login or a password reset.
const clearFailedLogins = async (user) => {
  if (!user.failedLoginAttempts && !user.lockUntil) return;
  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: "" } }
  );
};

module.exports = {
  MAX_FAILED_LOGINS,
  LOCKOUT_MINUTES,
  lockSecondsRemaining,
  recordFailedLogin,
  clearFailedLogins,
};

// Reference List:
// OWASP Foundation, [s.a.]a. Authentication Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> [Accessed 01 August 2026].
