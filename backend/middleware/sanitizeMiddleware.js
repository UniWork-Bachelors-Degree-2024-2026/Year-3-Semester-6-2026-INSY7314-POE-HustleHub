const { isDigit, isLetterAscii } = require("../utils/textChecks.js");

// Finds the end of the closing tag for script or style, comparing names without regard to case.
// Returns the index just after its ">" or -1 when it is missing.
const findClosingTagEnd = (value, name, from) => {
  let position = value.indexOf("</", from);
  while (position !== -1) {
    const candidate = value.slice(position + 2, position + 2 + name.length).toLowerCase();
    if (candidate === name) {
      const close = value.indexOf(">", position);
      if (close === -1) return value.length;
      return close + 1;
    }
    position = value.indexOf("</", position + 2);
  }
  return -1;
};

// Removes HTML tags by scanning the text. A "<" only starts a tag when a letter or "/" and a letter follow it.
// Plain text such as "5 < 6" or "<3" is left alone, and script and style elements are removed with their contents.
const stripHtml = (value) => {
  let output = "";
  let index = 0;

  while (index < value.length) {
    const character = value[index];
    if (character !== "<") {
      output += character;
      index += 1;
      continue;
    }

    const isClosing = value[index + 1] === "/";
    let nameStart = index + 1;
    if (isClosing) {
      nameStart += 1;
    }
    const startsTag = isLetterAscii(value[nameStart] || "");
    if (!startsTag) {
      output += character;
      index += 1;
      continue;
    }

    let nameEnd = nameStart;
    while (nameEnd < value.length && (isLetterAscii(value[nameEnd]) || isDigit(value[nameEnd]))) {
      nameEnd += 1;
    }
    const name = value.slice(nameStart, nameEnd).toLowerCase();

    const close = value.indexOf(">", nameEnd);
    let tagEnd = value.length;
    if (close !== -1) {
      tagEnd = close + 1;
    }

    if (!isClosing && (name === "script" || name === "style")) {
      const blockEnd = findClosingTagEnd(value, name, tagEnd);
      if (blockEnd === -1) {
        index = value.length;
      } else {
        index = blockEnd;
      }
      continue;
    }

    index = tagEnd;
  }

  return output;
};

// The password is never altered, so hashing and comparison use exactly what the user typed.
const SKIP_FIELDS = new Set(["password"]);

// Strings are stripped of HTML and objects lose any key that starts with $, contains a dot or is __proto__.
const cleanValue = (value) => {
  if (typeof value === "string") {
    return stripHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  }
  if (value && typeof value === "object") {
    const cleaned = {};
    for (const [key, inner] of Object.entries(value)) {
      // The __proto__ setter changes the prototype of an object (MDN Web Docs, 2026l),
      // and CodeQL warns against using untrusted text as a property name (CodeQL, 2026a).
      if (key === "__proto__") continue;
      if (key.startsWith("$") || key.includes(".")) continue;
      if (SKIP_FIELDS.has(key)) {
        cleaned[key] = inner;
      } else {
        cleaned[key] = cleanValue(inner);
      }
    }
    return cleaned;
  }
  return value;
};

// Empties the object and copies the cleaned keys back in.
const replaceContents = (target, cleaned) => {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, cleaned);
};

// Cleans the body, query string and URL params before the request reaches a route.
const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === "object") req.body = cleanValue(req.body);
  // Query values are untrusted (Express, 2026), so the cleaned copy replaces req.query as an own property.
  // The built-in req.query getter re-parses the URL on every read, so editing it in place would be lost.
  Object.defineProperty(req, "query", {
    value: cleanValue(req.query),
    writable: true,
    configurable: true,
    enumerable: true,
  });
  if (req.params) replaceContents(req.params, cleanValue(req.params));
  next();
};

// RegExp.escape returns the text with every regex special character escaped, so it can be matched literally (MDN Web Docs, 2026k).
const escapeRegex = (text) => RegExp.escape(String(text));

module.exports = { sanitizeRequest, cleanValue, stripHtml, escapeRegex };

// Reference List:
// Express, 2026. Express 5.x API reference: Request. [online] Available at: <https://expressjs.com/en/5x/api/request/> [Accessed 8 October 2026].
// CodeQL, 2026a. Remote property injection. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-remote-property-injection/> [Accessed 7 November 2026].
// MDN Web Docs, 2026k. RegExp.escape(). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape> [Accessed 10 October 2026].
// MDN Web Docs, 2026l. Object.prototype.__proto__. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto> [Accessed 7 November 2026].
