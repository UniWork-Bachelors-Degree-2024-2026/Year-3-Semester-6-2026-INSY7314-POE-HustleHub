const cors = require("cors");
const helmet = require("helmet");

// The allowed origins come from ALLOWED_ORIGINS (comma separated) so Docker and hosting can change them without code edits.
// With nothing set, only the local frontend is allowed.
const DEFAULT_ORIGIN = "https://localhost:5173";
const parseAllowedOrigins = (value) => {
  const origins = String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return origins.length > 0 ? origins : [DEFAULT_ORIGIN];
};

const corsOptions = {
  origin: parseAllowedOrigins(process.env.ALLOWED_ORIGINS),
  credentials: true,
  optionsSuccessStatus: 200,
};

// Helmet options: the CSP uses useDefaults false and lists only the directives below (Helmet, 2026).
const helmetOptions = {
  // The API only returns JSON, so default-src 'none' blocks every resource type (Helmet, 2026).
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      // Violations are posted to the report endpoint, report-uri covers older browsers and report-to newer ones (MDN Web Docs, 2026a).
      reportUri: ["/api/csp-report"],
      reportTo: ["csp-endpoint"],
    },
  },
  // HSTS tells browsers to use HTTPS only for one year, including subdomains (Helmet, 2026).
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  // No Referer header is sent on requests made from API responses (Helmet, 2026).
  referrerPolicy: { policy: "no-referrer" },
  // The React app on another origin must be able to read API responses (Helmet, 2026).
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // X-Frame-Options DENY stops the API being framed by any page (Helmet, 2026).
  xFrameOptions: { action: "deny" },
};

// This function will handle enabling all security middleware for our app (rudderz243, 2026).
const setupSecurity = (app) => {
  app.use(helmet(helmetOptions));
  // Reporting-Endpoints maps the report-to name to the report URL (MDN Web Docs, 2026c).
  app.use((req, res, next) => {
    res.set("Reporting-Endpoints", 'csp-endpoint="/api/csp-report"');
    next();
  });
  app.use(cors(corsOptions));
};

module.exports = setupSecurity;
module.exports.parseAllowedOrigins = parseAllowedOrigins;

// Reference List:
// Helmet, 2026. Helmet.js. [online] Available at: <http://helmet.js.org/> [Accessed 8 October 2026].
// MDN Web Docs, 2026a. Content-Security-Policy: report-uri directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri> [Accessed 8 October 2026].
// MDN Web Docs, 2026c. Reporting-Endpoints header. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints> [Accessed 8 October 2026].
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
