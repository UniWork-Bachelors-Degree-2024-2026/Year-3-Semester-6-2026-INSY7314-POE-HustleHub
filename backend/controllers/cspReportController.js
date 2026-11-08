// Controller that receives Content Security Policy violation reports sent by browsers
const logger = require("../utils/logger.js");

// Reports are attacker-controlled data, so every value is cut to 200 characters and control characters are removed before logging (MDN Web Docs, 2026a).
const clean = (value) => {
  if (typeof value !== "string") return undefined;
  const printable = Array.from(value.slice(0, 200), (character) => {
    const code = character.codePointAt(0);
    if (code < 32 || code === 127) return " ";
    return character;
  });
  return printable.join("");
};

// Reads the legacy report-uri shape, a single object under the "csp-report" key (MDN Web Docs, 2026a).
const fromLegacy = (report) => ({
  directive: clean(report["effective-directive"] || report["violated-directive"]),
  blockedUri: clean(report["blocked-uri"]),
  documentUri: clean(report["document-uri"]),
  disposition: clean(report["disposition"]),
});

// Reads the report-to shape, where each report has type "csp-violation" and the details sit under body (MDN Web Docs, 2026b).
const fromReportingApi = (report) => ({
  directive: clean(report.body && report.body.effectiveDirective),
  blockedUri: clean(report.body && report.body.blockedURL),
  documentUri: clean(report.body && report.body.documentURL),
  disposition: clean(report.body && report.body.disposition),
});

// Logs each CSP violation report and always answers 204 so browsers do not retry
// ROUTE: POST /api/csp-report
// ACCESS: Public (browsers send reports without credentials)

const receiveCspReport = (req, res) => {
  const body = req.body;
  const entries = [];

  // report-uri sends one object, report-to sends an array of up to ten reports
  if (body && typeof body === "object" && body["csp-report"]) {
    entries.push(fromLegacy(body["csp-report"]));
  } else if (Array.isArray(body)) {
    for (const report of body.slice(0, 10)) {
      if (report && report.type === "csp-violation") entries.push(fromReportingApi(report));
    }
  }

  // Reports with no directive and no blocked resource carry nothing worth logging
  for (const entry of entries) {
    if (entry.directive || entry.blockedUri) {
      logger.warn(
        `CSP violation: Directive "${entry.directive}" blocked "${entry.blockedUri}" on "${entry.documentUri}"`,
        "SECURITY",
        entry
      );
    }
  }

  return res.status(204).end();
};

module.exports = { receiveCspReport };

// Reference List:
// MDN Web Docs, 2026a. Content-Security-Policy: report-uri directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri> [Accessed 8 October 2026].
// MDN Web Docs, 2026b. Content-Security-Policy: report-to directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-to> [Accessed 8 October 2026].
