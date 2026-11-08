// Hides most of an email address before it is written to a log, such as k***@gmail.com.
// The OWASP logging guidance says personal data should be masked or removed before it is recorded (OWASP Foundation, 2026).
const MASK = "***";
const MAX_DOMAIN_LENGTH = 255;

// Swaps control characters, such as a line break typed into the field, for a question mark so a log line cannot be split
const printable = (text) =>
  [...text]
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < 32 || code === 127) return "?";
      return character;
    })
    .join("");

const maskEmail = (email) => {
  if (typeof email !== "string") return MASK;

  const at = email.lastIndexOf("@");
  // Something without a name before the @ or a domain after it is not worth showing at all
  if (at < 1 || at === email.length - 1) return MASK;

  const domain = printable(email.slice(at, at + MAX_DOMAIN_LENGTH));
  return `${printable(email[0])}${MASK}${domain}`;
};

module.exports = { maskEmail };

// Reference List:
// OWASP Foundation, 2026. Logging Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> [Accessed 7 November 2026].
