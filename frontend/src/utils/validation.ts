// Mirrors backend/middleware/validationMiddleware.js so users see errors before the request is sent.
// The backend still validates everything; this is only for a better experience.
// EMAIL Must be formatted correctly (GeeksforGeeks, 2025).
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Letters (any language), digits, space and . _ ' - only. Rejects markup and injection characters.
// Mozilla Developer (2026) explains the Unicode property escapes (\p{L}, \p{M}) used in this pattern.
const USERNAME_REGEX = /^[\p{L}\p{M}0-9 ._'-]{2,30}$/u;
// Requires: 1 uppercase, 1 lowercase, 1 digit, 1 special char, min 8 chars (Codemia, 2025).
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

export const OTP_LENGTH = 6;

// A one time code is exactly six digits, anything else is rejected before the request is sent.
export function validateOtp(code: string): string | null {
  if (!code) return "Enter the 6 digit code from your email.";
  const allDigits = Array.from(code).every((character) => character >= "0" && character <= "9");
  if (code.length !== OTP_LENGTH || !allDigits) return "The code must be exactly 6 digits.";
  return null;
}

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Email is required.";
  if (value.length > 254) return "Email address exceeds maximum length of 254 characters.";
  if (!EMAIL_REGEX.test(value)) return "Please enter a valid email address (e.g. name@gmail.com).";
  return null;
}

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) return "Username is required.";
  if (value.length < 2 || value.length > 30) return "Username must be between 2 and 30 characters long.";
  if (!USERNAME_REGEX.test(value)) return "Username can only use letters, numbers, spaces and . _ ' -";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (!PASSWORD_REGEX.test(password)) {
    return "Password does not meet the complexity requirements.";
  }
  return null;
}

export const passwordRules = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "Upper & lower", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// Reference List:
// Codemia, 2025. Regex for password must contain at least eight characters, at least one number and both lower and uppercase letters and special characters. [online] Available at <https://codemia.io/knowledge-hub/path/regex_for_password_must_contain_at_least_eight_characters_at_least_one_number_and_both_lower_and_uppercase_letters_and_special_characters> [Accessed 15 August 2026].
// GeeksforGeeks, 2025. How to Validate Email Address using RegExp in JavaScript?. [online] Available at <https://www.geeksforgeeks.org/javascript/how-to-validate-email-address-using-regexp-in-javascript/> [Accessed 15 August 2026].
// Mozilla Developer, 2026. Unicode character class escape: \p{...}, \P{...}. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape> [Accessed 11 October 2026].
