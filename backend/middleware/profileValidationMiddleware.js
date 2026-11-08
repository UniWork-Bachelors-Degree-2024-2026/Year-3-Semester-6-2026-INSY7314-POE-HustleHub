// Validators for account changes and the public profile. The frontend checks similar rules, but only this is trusted.
const { GIG_CATEGORIES } = require("../models/gigModel.js");
const {
  PROFILE_BANNERS,
  PROFILE_AVAILABILITY,
  PROFILE_EXPERIENCE,
  AVATAR_MAX_LENGTH,
} = require("../models/profileModel.js");
const { validateEmailFormat, validatePasswordComplexity } = require("./validationMiddleware.js");
const { isPlainText, isDigitsOnly, containsDigit } = require("../utils/textChecks.js");

// A profile photo must start with one of these data URL prefixes, one per allowed image type.
const AVATAR_PREFIXES = Object.freeze({
  jpeg: "data:image/jpeg;base64,",
  png: "data:image/png;base64,",
  webp: "data:image/webp;base64,",
});

const sendInvalid = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors,
  });

// Checks the first bytes of the decoded image against the signature for the type it claims to be.
// The label in the data URL can be faked, so the content itself is inspected (OWASP, 2026e).
// The signatures are the ones listed for JPEG, PNG and WebP files (Wikipedia, 2026).
const matchesImageSignature = (type, base64) => {
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (type === "jpeg") {
    return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (type === "png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return head.length >= 8 && png.every((byte, index) => head[index] === byte);
  }
  if (type === "webp") {
    return (
      head.length >= 12 &&
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
};

// Returns the image type and base64 text for a safe photo data URL, or null when it is not one.
const readAvatar = (value) => {
  if (typeof value !== "string" || value.length > AVATAR_MAX_LENGTH) return null;

  for (const [type, prefix] of Object.entries(AVATAR_PREFIXES)) {
    if (!value.startsWith(prefix)) continue;
    const base64 = value.slice(prefix.length);
    // Decoding and re-encoding gives the same text only when it is clean base64
    const isCleanBase64 =
      base64.length > 0 && Buffer.from(base64, "base64").toString("base64") === base64;
    if (isCleanBase64 && matchesImageSignature(type, base64)) {
      return { type, base64 };
    }
  }
  return null;
};

// Returns an error message for a link field, or null when it is empty or safe to show as a link.
// Only https is accepted, so javascript: and data: links can never be stored (MDN Web Docs, 2026j).
const checkUrl = (value, label, requiredHost) => {
  if (value === "") return null;
  if (typeof value !== "string" || value.length > 200) {
    return `${label} must be 200 characters or fewer.`;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return `Enter a valid ${label.toLowerCase()} address.`;
  }

  if (url.protocol !== "https:") return `${label} must start with https://`;
  if (url.username || url.password) return `${label} cannot contain a username or password.`;
  if (!url.hostname.includes(".")) return `Enter a valid ${label.toLowerCase()} address.`;

  if (requiredHost) {
    const onHost = url.hostname === requiredHost || url.hostname.endsWith(`.${requiredHost}`);
    if (!onHost) return `${label} must be a ${requiredHost} address.`;
  }
  return null;
};

// Validates a change of username and email on the account.
const validateAccountUpdate = (req, res, next) => {
  const { username, email } = req.body;
  const errors = [];

  const cleanName = typeof username === "string" && username.trim();
  if (!cleanName || cleanName.length < 2 || cleanName.length > 30 || !isPlainText(cleanName, 30)) {
    errors.push(
      "Username must be between 2 and 30 characters and cannot contain markup characters."
    );
  }

  const emailError = validateEmailFormat(email);
  if (emailError) errors.push(emailError);

  if (errors.length > 0) {
    return sendInvalid(res, errors);
  }

  req.body.username = cleanName;
  req.body.email = email.trim().toLowerCase();
  next();
};

// Validates a password change from inside a logged in session.
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (
    typeof currentPassword !== "string" ||
    currentPassword.length === 0 ||
    currentPassword.length > 128
  ) {
    errors.push("Enter your current password.");
  }

  // The new password follows the same complexity rules as registration
  const passwordError = validatePasswordComplexity(newPassword);
  if (passwordError) {
    errors.push(passwordError);
  } else if (newPassword.length > 128) {
    errors.push("Password cannot be longer than 128 characters.");
  }

  if (errors.length > 0) {
    return sendInvalid(res, errors);
  }
  next();
};

// Copies a text field into clean when it passes, otherwise records the message.
const takeText = (body, clean, errors, field, max, message, allowNewlines = false) => {
  if (body[field] === undefined) return;
  if (isPlainText(body[field], max, allowNewlines)) {
    clean[field] = body[field].trim();
  } else {
    errors.push(message);
  }
};

// Validates the public profile. Only fields that were sent are checked, and only known fields are kept.
const validateProfileUpdate = (req, res, next) => {
  const body = req.body;
  const errors = [];
  const clean = {};

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return sendInvalid(res, ["Profile details must be an object."]);
  }

  if (body.visible !== undefined) {
    if (typeof body.visible === "boolean") {
      clean.visible = body.visible;
    } else {
      errors.push("visible must be true or false.");
    }
  }

  if (body.avatar !== undefined) {
    if (body.avatar === "") {
      clean.avatar = "";
    } else if (readAvatar(body.avatar)) {
      clean.avatar = body.avatar;
    } else {
      errors.push(
        "The profile photo must be a valid JPEG, PNG or WebP image under the size limit."
      );
    }
  }

  if (body.banner !== undefined) {
    if (PROFILE_BANNERS.includes(body.banner)) clean.banner = body.banner;
    else errors.push("Choose a banner from the list.");
  }

  if (body.availability !== undefined) {
    if (PROFILE_AVAILABILITY.includes(body.availability)) clean.availability = body.availability;
    else errors.push("Choose an availability from the list.");
  }

  if (body.experience !== undefined) {
    if (body.experience === "" || PROFILE_EXPERIENCE.includes(body.experience))
      clean.experience = body.experience;
    else errors.push("Choose an experience level from the list.");
  }

  if (body.category !== undefined) {
    if (body.category === "" || GIG_CATEGORIES.includes(body.category))
      clean.category = body.category;
    else errors.push("Choose a category from the list.");
  }

  takeText(body, clean, errors, "headline", 80, "Headline has characters that are not allowed.");
  takeText(body, clean, errors, "bio", 500, "Bio has characters that are not allowed.", true);
  takeText(body, clean, errors, "company", 60, "Company name has characters that are not allowed.");
  takeText(body, clean, errors, "industry", 60, "Industry has characters that are not allowed.");

  if (body.location !== undefined) {
    const value = body.location;
    const validPlace =
      value === "" || (isPlainText(value, 60) && value.trim().length >= 2 && !containsDigit(value));
    if (validPlace) clean.location = value.trim();
    else errors.push("Enter a place name without numbers, for example Cape Town, South Africa.");
  }

  if (body.website !== undefined) {
    const problem = checkUrl(body.website, "Website");
    if (problem) errors.push(problem);
    else clean.website = body.website;
  }

  if (body.linkedin !== undefined) {
    const problem = checkUrl(body.linkedin, "LinkedIn", "linkedin.com");
    if (problem) errors.push(problem);
    else clean.linkedin = body.linkedin;
  }

  if (body.hourlyRate !== undefined) {
    const rate = body.hourlyRate;
    const validRate = rate === "" || (isDigitsOnly(rate) && rate.length <= 5 && rate[0] !== "0");
    if (validRate) clean.hourlyRate = rate;
    else errors.push("Enter a whole rand amount from 1 to 99999.");
  }

  if (body.skills !== undefined) {
    const skills = body.skills;
    const validSkills =
      Array.isArray(skills) &&
      skills.length <= 12 &&
      skills.every((skill) => isPlainText(skill, 24) && skill.trim().length >= 2);
    if (validSkills) clean.skills = skills.map((skill) => skill.trim());
    else errors.push("Add up to 12 skills of 2 to 24 characters each, without markup characters.");
  }

  if (body.hiring !== undefined) {
    const hiring = body.hiring;
    const validHiring =
      Array.isArray(hiring) &&
      hiring.length <= 4 &&
      hiring.every((category) => GIG_CATEGORIES.includes(category));
    if (validHiring) clean.hiring = hiring;
    else errors.push("Pick up to 4 categories from the list.");
  }

  if (errors.length > 0) {
    return sendInvalid(res, errors);
  }

  // Only the checked fields continue, so unknown or private keys never reach the database
  req.body = clean;
  next();
};

module.exports = {
  validateAccountUpdate,
  validatePasswordChange,
  validateProfileUpdate,
};

// Reference List:
// MDN Web Docs, 2026j. URL. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/API/URL> [Accessed 10 October 2026].
// OWASP, 2026e. File Upload Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html> [Accessed 10 October 2026].
// Wikipedia, 2026. List of file signatures. [online] Available at: <https://en.wikipedia.org/wiki/List_of_file_signatures> [Accessed 10 October 2026].
