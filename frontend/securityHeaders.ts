// Security headers served with the React app, shared by the dev server and the production preview.
// The API origin can be changed with the API_ORIGIN environment variable, for example when the stack runs in Docker.
const API_ORIGIN = process.env.API_ORIGIN || "https://localhost:3000";
const REPORT_URL = `${API_ORIGIN}/api/csp-report`;

// Directives used by both policies. Blocks plugins, base tag changes and framing (MDN Web Docs, 2026e).
const baseDirectives = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  // Violations are posted to the API, report-uri covers older browsers and report-to newer ones (MDN Web Docs, 2026a).
  `report-uri ${REPORT_URL}`,
  "report-to csp-endpoint",
];

// Production policy: scripts and styles only from the app itself, plus the Google Fonts stylesheet host.
// Style props set by React through element.style are not blocked, so no inline style source is needed (MDN Web Docs, 2026f).
const productionDirectives = [
  ...baseDirectives,
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  // connect-src limits fetch and WebSocket targets to the app and the API (MDN Web Docs, 2026g).
  `connect-src 'self' ${API_ORIGIN}`,
];

// Development policy: Vite injects inline scripts and styles and opens a WebSocket for hot reload.
const developmentDirectives = [
  ...baseDirectives,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `connect-src 'self' wss://localhost:5173 ${API_ORIGIN}`,
];

// Headers that do not change between environments.
const commonHeaders = {
  // Reporting-Endpoints maps the report-to name to the backend report URL (MDN Web Docs, 2026c).
  "Reporting-Endpoints": `csp-endpoint="${REPORT_URL}"`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export const developmentHeaders = {
  ...commonHeaders,
  "Content-Security-Policy": developmentDirectives.join("; "),
};

export const productionHeaders = {
  ...commonHeaders,
  "Content-Security-Policy": productionDirectives.join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// Reference List:
// MDN Web Docs, 2026a. Content-Security-Policy: report-uri directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/report-uri> [Accessed 8 October 2026].
// MDN Web Docs, 2026c. Reporting-Endpoints header. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints> [Accessed 8 October 2026].
// MDN Web Docs, 2026e. Content Security Policy (CSP). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP> [Accessed 8 October 2026].
// MDN Web Docs, 2026f. Content-Security-Policy: style-src directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src> [Accessed 8 October 2026].
// MDN Web Docs, 2026g. Content-Security-Policy: connect-src directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src> [Accessed 8 October 2026].
