// Controller for changes a logged in member makes to their own account
const User = require("../models/userModel.js");
const { generateToken } = require("./authController.js");
const logger = require("../utils/logger.js");
const { maskEmail } = require("../utils/maskEmail.js");
const { recordEvent } = require("../utils/audit.js");

/**
 * Updates the username and email of the logged in member
 * ROUTE -> PUT /api/auth/profile
 * ACCESS -> Private (requires valid JWT)
 */
const updateAccount = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      logger.warn(`Account update failed: User not found for ID ${req.user._id}`, "AUTH");
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // The new email must not belong to anyone else
    if (email !== user.email) {
      // CodeQL recommends $eq for values that come from a request, so they are only ever compared as plain values (CodeQL, 2026d).
      const taken = await User.findOne({ email: { $eq: email }, _id: { $ne: user._id } });
      if (taken) {
        logger.warn(
          `Account update rejected: Email "${maskEmail(email)}" is already in use by another account`,
          "AUTH"
        );
        return res.status(400).json({ message: "That email address is already in use." });
      }
    }

    user.username = username;
    user.email = email;
    await user.save();

    logger.info(
      `Account updated successfully for user ID ${user._id} (Username: "${user.username}", Email: "${maskEmail(user.email)}")`,
      "AUTH"
    );

    return res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    logger.error(`Update account error: ${error.message}`, "AUTH", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "That email address is already in use." });
    }
    return res.status(500).json({ message: "Server error while updating the account." });
  }
};

/**
 * Changes the password after checking the current one, then signs older sessions out
 * ROUTE -> PUT /api/auth/password
 * ACCESS -> Private (requires valid JWT)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // The current password must be confirmed so a stolen session alone cannot change it (OWASP, 2026f).
    const user = await User.findById(req.user._id);
    if (!user) {
      logger.warn(`Password change failed: User not found for ID ${req.user._id}`, "AUTH");
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // A wrong password is a 400, not a 401, because the session itself is still valid
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      logger.warn(
        `Password change rejected: Incorrect current password entered for user "${maskEmail(user.email)}"`,
        "AUTH"
      );
      await recordEvent({
        type: "password_change",
        outcome: "failure",
        userId: user._id,
        detail: "wrong current password",
        req,
      });
      return res.status(400).json({ message: "Your current password is incorrect." });
    }

    if (currentPassword === newPassword) {
      logger.warn(
        `Password change rejected: Attempted to reuse existing password for user "${maskEmail(user.email)}"`,
        "AUTH"
      );
      return res.status(400).json({ message: "Choose a password you have not used before." });
    }

    // The pre-save hook hashes the new password, and the timestamp retires every older token
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info(
      `Password changed successfully for user "${maskEmail(user.email)}". Previous sessions invalidated.`,
      "AUTH"
    );
    await recordEvent({ type: "password_change", outcome: "success", userId: user._id, req });

    // A fresh token keeps this device logged in while every other device is signed out
    return res.status(200).json({
      message: "Your password has been updated.",
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`, "AUTH", error);
    return res.status(500).json({ message: "Server error while changing the password." });
  }
};

module.exports = { updateAccount, changePassword };

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
// OWASP, 2026f. Authentication Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> [Accessed 10 October 2026].
