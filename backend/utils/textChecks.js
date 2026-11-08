// Small text checks written with plain string methods, so there are no patterns to maintain.

// Characters that have no place in names, headlines or bios and are used in markup and injection attempts.
const FORBIDDEN_CHARACTERS = Object.freeze(["<", ">", "{", "}", "\\", "$", "|", "^", "~", "`"]);

const isDigit = (character) => character >= "0" && character <= "9";

const isLetterAscii = (character) =>
  (character >= "a" && character <= "z") || (character >= "A" && character <= "Z");

const hasForbiddenCharacters = (value) =>
  FORBIDDEN_CHARACTERS.some((character) => value.includes(character));

// Control characters are code points below 32 and 127. New lines and tabs can be allowed for long text.
const hasControlCharacters = (value, allowNewlines = false) =>
  Array.from(value).some((character) => {
    const code = character.codePointAt(0);
    if (allowNewlines && (code === 9 || code === 10 || code === 13)) {
      return false;
    }
    return code < 32 || code === 127;
  });

// True for a string within the length limit with no forbidden or control characters.
const isPlainText = (value, max, allowNewlines = false) =>
  typeof value === "string" &&
  value.length <= max &&
  !hasForbiddenCharacters(value) &&
  !hasControlCharacters(value, allowNewlines);

// True when the value is made only of the digits 0 to 9, optionally with an exact length.
const isDigitsOnly = (value, exactLength) => {
  if (typeof value !== "string" || value.length === 0) return false;
  if (exactLength !== undefined && value.length !== exactLength) return false;
  return Array.from(value).every(isDigit);
};

const containsDigit = (value) => Array.from(value).some(isDigit);

module.exports = {
  isDigit,
  isLetterAscii,
  hasForbiddenCharacters,
  hasControlCharacters,
  isPlainText,
  isDigitsOnly,
  containsDigit,
};
