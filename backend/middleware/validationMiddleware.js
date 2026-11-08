// This file validates authentication
// It enforces the email format and password complexity
const { isDigitsOnly } = require("../utils/textChecks.js");

// EMAIL Must be formatted correctly (GeeksforGeeks, 2025).
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Validates password structure and returns list of any violated  rules
// Must have length: 8 to 128 characters, one uppercase letter,
// one lowercase letter,  one numerber, one special character
const validatePasswordComplexity = (password) => {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }

  // Requires: 1 uppercase, 1 lowercase, 1 digit, 1 special char, min 8 chars (Codemia, 2025).
  const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!passwordPattern.test(password)) {
    return "Password does not meet the complexity requirements.";
  }

  return null;
};

//  Validates email structure
const validateEmailFormat = (email) => {
  if (!email || typeof email !== "string") {
    return "Email is required.";
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length > 254) {
    return "Email address exceeds maximum length of 254 characters.";
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return "Please enter a valid email address (e.g. name@gmail.com).";
  }

  return null;
};

//Validate Registration Payload
const validateRegistration = (req, res, next) => {
  const { username, email, password } = req.body;
  const validationErrors = [];

  // Username validation
  if (!username || typeof username !== "string" || username.trim().length === 0) {
    validationErrors.push("Username is required.");
  } else if (username.trim().length < 2 || username.trim().length > 30) {
    validationErrors.push("Username must be between 2 and 30 characters long.");
  }

  // Email validation
  const emailError = validateEmailFormat(email);
  if (emailError) {
    validationErrors.push(emailError);
  }

  // Password structure validation
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) {
    validationErrors.push(passwordError);
  }

  // If any errors exist, respond with 400 Bad Request
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: validationErrors,
    });
  }

  // Normalize email and username in req.body
  req.body.email = email.trim().toLowerCase();
  req.body.username = username.trim();

  next();
};

// Validate Login Payload
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  // Check email presence and basic structure
  if (
    !email ||
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email.trim()) ||
    email.trim().length > 254
  ) {
    return res.status(400).json({ message: "Invalid credentials. Email or Password Incorrect." });
  }

  // Check password presence
  if (!password || typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ message: "Invalid credentials. Email or Password Incorrect." });
  }

  // Normalize email
  req.body.email = email.trim().toLowerCase();

  next();
};

// Sends the 400 response shared by the one time passcode validators
const rejectInvalid = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors,
  });

// Validates a body that only needs an email address (resend code, forgot password)
const validateEmailOnly = (req, res, next) => {
  const emailError = validateEmailFormat(req.body.email);
  if (emailError) {
    return rejectInvalid(res, [emailError]);
  }

  req.body.email = req.body.email.trim().toLowerCase();
  next();
};

// Validates the email and six digit code sent when confirming registration
const validateOtpVerify = (req, res, next) => {
  const errors = [];
  const { email, code } = req.body;

  const emailError = validateEmailFormat(email);
  if (emailError) errors.push(emailError);

  if (typeof code !== "string" || !isDigitsOnly(code.trim(), 6)) {
    errors.push("The verification code must be exactly 6 digits.");
  }

  if (errors.length > 0) {
    return rejectInvalid(res, errors);
  }

  req.body.email = email.trim().toLowerCase();
  req.body.code = code.trim();
  next();
};

// Validates the body used to switch two-factor login on or off
const validateTwoFactorToggle = (req, res, next) => {
  const errors = [];
  const { enabled, password } = req.body;

  if (typeof enabled !== "boolean") {
    errors.push("Choose whether two-factor login should be on or off.");
  }

  if (typeof password !== "string" || password.length === 0 || password.length > 128) {
    errors.push("Enter your current password.");
  }

  if (errors.length > 0) {
    return rejectInvalid(res, errors);
  }

  next();
};

// Validates the email, code and new password sent when resetting a password
const validateResetPassword = (req, res, next) => {
  const errors = [];
  const { email, code, newPassword } = req.body;

  const emailError = validateEmailFormat(email);
  if (emailError) errors.push(emailError);

  if (typeof code !== "string" || !isDigitsOnly(code.trim(), 6)) {
    errors.push("The reset code must be exactly 6 digits.");
  }

  const passwordError = validatePasswordComplexity(newPassword);
  if (passwordError) errors.push(passwordError);

  if (errors.length > 0) {
    return rejectInvalid(res, errors);
  }

  req.body.email = email.trim().toLowerCase();
  req.body.code = code.trim();
  next();
};

// Import allowed categories and statuses from the Gig model
const { GIG_CATEGORIES, GIG_STATUS } = require("../models/gigModel.js");

// Validates that an ID in the URL is a valid 24-character MongoDB ID
// This stops database cast errors from crashing the server
const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;

    if (!id || !objectIdPattern.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID format for parameter '${paramName}'. Must be a 24-character hex string.`,
      });
    }

    next();
  };
};

// Validates fields when creating a new gig
const validateGigInput = (req, res, next) => {
  const { title, description, category, price, deliveryTimeDays, status } = req.body;
  const validationErrors = [];

  // Title: 5 to 100 characters
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    validationErrors.push("Gig title is required.");
  } else if (title.trim().length < 5 || title.trim().length > 100) {
    validationErrors.push("Gig title must be between 5 and 100 characters long.");
  }

  // Description: 20 to 2000 characters
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    validationErrors.push("Gig description is required.");
  } else if (description.trim().length < 20 || description.trim().length > 2000) {
    validationErrors.push("Gig description must be between 20 and 2000 characters long.");
  }

  // Category: must match one of the allowed categories
  if (!category || typeof category !== "string") {
    validationErrors.push("Gig category is required.");
  } else if (!GIG_CATEGORIES.includes(category.trim())) {
    validationErrors.push(`Category must be one of: ${GIG_CATEGORIES.join(", ")}.`);
  }

  // Price: positive number between 1.00 and 1,000,000.00 ZAR
  const numericPrice = Number(price);
  if (
    price === undefined ||
    price === null ||
    isNaN(numericPrice) ||
    !Number.isFinite(numericPrice)
  ) {
    validationErrors.push("Price must be a valid number.");
  } else if (numericPrice < 1) {
    validationErrors.push("Price must be at least 1.00 ZAR.");
  } else if (numericPrice > 1000000) {
    validationErrors.push("Price cannot exceed 1,000,000.00 ZAR.");
  }

  // Delivery time: integer between 1 and 90 days
  const numericDelivery = Number(deliveryTimeDays);
  if (
    deliveryTimeDays === undefined ||
    deliveryTimeDays === null ||
    !Number.isInteger(numericDelivery)
  ) {
    validationErrors.push("Delivery time must be an integer number of days.");
  } else if (numericDelivery < 1 || numericDelivery > 90) {
    validationErrors.push("Delivery time must be between 1 and 90 days.");
  }

  // Status: optional, defaults to 'active', but must be valid if supplied
  if (status && !GIG_STATUS.includes(status)) {
    validationErrors.push(`Status must be one of: ${GIG_STATUS.join(", ")}.`);
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Gig validation failed.",
      errors: validationErrors,
    });
  }

  // Clean and format inputs before sending to controller
  req.body.title = title.trim();
  req.body.description = description.trim();
  req.body.category = category.trim();
  req.body.price = Number(numericPrice.toFixed(2));
  req.body.deliveryTimeDays = numericDelivery;

  next();
};

// Validates fields when updating an existing gig
const validateGigUpdate = (req, res, next) => {
  const { title, description, category, price, deliveryTimeDays, status } = req.body;
  const validationErrors = [];

  // Make sure at least one field was sent to update
  const updatableFields = [title, description, category, price, deliveryTimeDays, status];
  const hasUpdates = updatableFields.some((field) => field !== undefined);

  if (!hasUpdates) {
    return res.status(400).json({
      success: false,
      message: "At least one field must be provided to update the gig.",
    });
  }

  // Title validation
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length < 5 || title.trim().length > 100) {
      validationErrors.push("Gig title must be between 5 and 100 characters long.");
    } else {
      req.body.title = title.trim();
    }
  }

  // Description validation
  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      description.trim().length < 20 ||
      description.trim().length > 2000
    ) {
      validationErrors.push("Gig description must be between 20 and 2000 characters long.");
    } else {
      req.body.description = description.trim();
    }
  }

  // Category validation
  if (category !== undefined) {
    if (typeof category !== "string" || !GIG_CATEGORIES.includes(category.trim())) {
      validationErrors.push(`Category must be one of: ${GIG_CATEGORIES.join(", ")}.`);
    } else {
      req.body.category = category.trim();
    }
  }

  // Price validation
  if (price !== undefined) {
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || !Number.isFinite(numericPrice) || numericPrice < 1) {
      validationErrors.push("Price must be a valid number of at least 1.00 ZAR.");
    } else if (numericPrice > 1000000) {
      validationErrors.push("Price cannot exceed 1,000,000.00 ZAR.");
    } else {
      req.body.price = Number(numericPrice.toFixed(2));
    }
  }

  // Delivery time validation
  if (deliveryTimeDays !== undefined) {
    const numericDelivery = Number(deliveryTimeDays);
    if (!Number.isInteger(numericDelivery) || numericDelivery < 1 || numericDelivery > 90) {
      validationErrors.push("Delivery time must be an integer between 1 and 90 days.");
    } else {
      req.body.deliveryTimeDays = numericDelivery;
    }
  }

  // Status validation
  if (status !== undefined) {
    if (!GIG_STATUS.includes(status)) {
      validationErrors.push(`Status must be one of: ${GIG_STATUS.join(", ")}.`);
    }
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Gig update validation failed.",
      errors: validationErrors,
    });
  }

  next();
};

// Import allowed booking statuses
const { BOOKING_STATUS } = require("../models/bookingModel.js");

// Simulated payment methods a client can choose when booking
const PAYMENT_METHODS = Object.freeze(["simulated_card", "simulated_eft"]);

// Validates input for creating a booking
const validateBookingInput = (req, res, next) => {
  const { gigId, scheduledDate, requirements } = req.body;
  const validationErrors = [];
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;

  if (!gigId || typeof gigId !== "string" || !objectIdPattern.test(gigId)) {
    validationErrors.push("A valid gigId is required.");
  }

  if (scheduledDate !== undefined && scheduledDate !== null) {
    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      validationErrors.push("scheduledDate must be a valid date string.");
    }
  }

  // Payment method is simulated, so only the listed methods are accepted
  const { paymentMethod } = req.body;
  if (paymentMethod !== undefined && !PAYMENT_METHODS.includes(paymentMethod)) {
    validationErrors.push(`paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}.`);
  }

  if (requirements !== undefined && requirements !== null) {
    if (typeof requirements !== "string") {
      validationErrors.push("requirements must be text.");
    } else if (requirements.length > 2000) {
      validationErrors.push("requirements cannot exceed 2000 characters.");
    } else {
      req.body.requirements = requirements.trim();
    }
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Booking validation failed.",
      errors: validationErrors,
    });
  }

  next();
};

// Validates input for updating a booking's status
const validateBookingStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status || typeof status !== "string") {
    return res.status(400).json({
      success: false,
      message: "Status field is required.",
    });
  }

  if (!BOOKING_STATUS.includes(status.trim())) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values are: ${BOOKING_STATUS.join(", ")}.`,
    });
  }

  req.body.status = status.trim();
  next();
};

module.exports = {
  EMAIL_REGEX,
  GIG_CATEGORIES,
  GIG_STATUS,
  BOOKING_STATUS,
  PAYMENT_METHODS,
  validatePasswordComplexity,
  validateEmailFormat,
  validateRegistration,
  validateLogin,
  validateEmailOnly,
  validateOtpVerify,
  validateTwoFactorToggle,
  validateResetPassword,
  validateObjectId,
  validateGigInput,
  validateGigUpdate,
  validateBookingInput,
  validateBookingStatusUpdate,
};

// Reference List:
// Codemia, 2025. Regex for password must contain at least eight characters, at least one number and both lower and uppercase letters and special characters. [online] Available at <https://codemia.io/knowledge-hub/path/regex_for_password_must_contain_at_least_eight_characters_at_least_one_number_and_both_lower_and_uppercase_letters_and_special_characters> [Accessed 15 August 2026].
// GeeksforGeeks, 2025. How to Validate Email Address using RegExp in JavaScript?. [online] Available at <https://www.geeksforgeeks.org/javascript/how-to-validate-email-address-using-regexp-in-javascript/> [Accessed 15 August 2026].
