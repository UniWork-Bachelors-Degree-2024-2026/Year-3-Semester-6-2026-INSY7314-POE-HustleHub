// Import express
const express = require("express");
// Import the authentication controller functions
const { loginUser, getProfile } = require("../controllers/authController.js");
// Import the account controller functions
const { updateAccount, changePassword } = require("../controllers/accountController.js");
// Import the two-factor login controller functions
const { verifyLoginCode, setTwoFactor } = require("../controllers/twoFactorController.js");
// Import the one time passcode controller functions
const {
  startRegistration,
  verifyRegistration,
  resendRegistrationCode,
  forgotPassword,
  resetPassword,
} = require("../controllers/otpController.js");
// Import input validation middleware
const {
  validateRegistration,
  validateLogin,
  validateEmailOnly,
  validateOtpVerify,
  validateResetPassword,
  validateTwoFactorToggle,
} = require("../middleware/validationMiddleware.js");

// Import the account change validators
const {
  validateAccountUpdate,
  validatePasswordChange,
} = require("../middleware/profileValidationMiddleware.js");

// Import the stricter limiters used on login, registration and account changes
const { authLimiter, otpLimiter, accountLimiter } = require("../middleware/rateLimitMiddleware.js");

// Import JWT auth middleware (rudderz243, 2026).
const { validateAuth } = require("../middleware/authMiddleware.js");

// Set up an instance of the router class
const router = express.Router();

// Define routes for user registration and login with input validation
// Registration takes two steps: request a code, then confirm it to create the account
router.post("/register", authLimiter, validateRegistration, startRegistration);
router.post("/register/verify", otpLimiter, validateOtpVerify, verifyRegistration);
router.post("/register/resend", otpLimiter, validateEmailOnly, resendRegistrationCode);
router.post("/login", authLimiter, validateLogin, loginUser);
// Second step of a two-factor login: confirm the emailed code to receive the token
router.post("/login/2fa", otpLimiter, validateOtpVerify, verifyLoginCode);

// Password reset takes two steps: request a code, then confirm it with a new password
router.post("/password/forgot", authLimiter, validateEmailOnly, forgotPassword);
router.post("/password/reset", otpLimiter, validateResetPassword, resetPassword);

// Protected route: demonstrates JWT validation on a request beyond login
// The token returned from /login must be sent as "Authorization: Bearer <token>" (rudderz243, 2026).
router.get("/profile", validateAuth, getProfile);

// Protected routes: change the username and email, or the password (needs the current one)
router.put("/profile", accountLimiter, validateAuth, validateAccountUpdate, updateAccount);
router.put("/password", accountLimiter, validateAuth, validatePasswordChange, changePassword);
// Protected route: switch two-factor login on or off (needs the current password)
router.put("/2fa", accountLimiter, validateAuth, validateTwoFactorToggle, setTwoFactor);

// Export the router
module.exports = router;

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
