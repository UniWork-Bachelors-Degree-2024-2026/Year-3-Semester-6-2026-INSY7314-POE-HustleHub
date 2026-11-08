import { describe, expect, it } from "vitest";
import { developmentHeaders, productionHeaders } from "./securityHeaders.ts";

// Splits a policy string into a map of directive name to its list of sources.
function parsePolicy(policy: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    // Directive names and sources are separated by single spaces, so empty pieces are dropped
    const [name, ...sources] = part.trim().split(" ").filter(Boolean);
    if (name) directives[name] = sources;
  }
  return directives;
}

const production = parsePolicy(productionHeaders["Content-Security-Policy"]);
const development = parsePolicy(developmentHeaders["Content-Security-Policy"]);

// Each it block below defines a set of related expectations (Vitest, 2026a).
// toEqual compares structure, toBe compares primitives, toContain checks array membership and not negates a matcher (Vitest, 2026b).
describe("production Content-Security-Policy", () => {
  // default-src 'none' is the deny-by-default starting point for a strict policy (OWASP, 2026c).
  it("denies everything by default", () => {
    expect(production["default-src"]).toEqual(["'none'"]);
  });

  it("allows scripts only from the app itself", () => {
    expect(production["script-src"]).toEqual(["'self'"]);
  });

  // Inline code is blocked unless 'unsafe-inline' is listed, so its absence keeps inline code blocked (MDN Web Docs, 2026f).
  it("never allows inline or eval code", () => {
    const policy = productionHeaders["Content-Security-Policy"];
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("limits styles to the app and the Google Fonts stylesheet host", () => {
    expect(production["style-src"]).toEqual(["'self'", "https://fonts.googleapis.com"]);
  });

  it("limits connections to the app and the API", () => {
    expect(production["connect-src"]).toEqual(["'self'", "https://localhost:3000"]);
  });

  // frame-ancestors, object-src and base-uri set to 'none' block framing, plugins and base tag changes (MDN Web Docs, 2026e).
  it("blocks framing, plugins and base tag changes", () => {
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
    expect(production["object-src"]).toEqual(["'none'"]);
    expect(production["base-uri"]).toEqual(["'none'"]);
  });

  it("sends violation reports to the API", () => {
    expect(production["report-uri"]).toEqual(["https://localhost:3000/api/csp-report"]);
    expect(production["report-to"]).toEqual(["csp-endpoint"]);
    expect(productionHeaders["Reporting-Endpoints"]).toBe('csp-endpoint="https://localhost:3000/api/csp-report"');
  });

  // A permissive policy is likely to lead to bypasses, so no wildcard or plain http source is allowed (OWASP, 2026c).
  it("does not allow any wildcard source", () => {
    const sources = Object.values(production).flat();
    expect(sources).not.toContain("*");
    expect(sources.filter((source) => source.startsWith("http:"))).toEqual([]);
  });
});

describe("development Content-Security-Policy", () => {
  it("only relaxes scripts and styles for Vite hot reload", () => {
    expect(development["script-src"]).toContain("'unsafe-inline'");
    expect(development["style-src"]).toContain("'unsafe-inline'");
    expect(development["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("keeps the same framing and plugin restrictions as production", () => {
    expect(development["frame-ancestors"]).toEqual(production["frame-ancestors"]);
    expect(development["object-src"]).toEqual(production["object-src"]);
    expect(development["default-src"]).toEqual(production["default-src"]);
  });
});

describe("extra security headers", () => {
  it("are sent in both environments", () => {
    for (const headers of [productionHeaders, developmentHeaders]) {
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["Referrer-Policy"]).toBe("no-referrer");
      expect(headers["Permissions-Policy"]).toContain("camera=()");
    }
  });

  it("only sends HSTS from the production headers", () => {
    expect(productionHeaders["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect("Strict-Transport-Security" in developmentHeaders).toBe(false);
  });
});

// Reference List:
// MDN Web Docs, 2026e. Content Security Policy (CSP). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP> [Accessed 8 October 2026].
// MDN Web Docs, 2026f. Content-Security-Policy: style-src directive. [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src> [Accessed 8 October 2026].
// OWASP, 2026c. Content Security Policy Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html> [Accessed 8 October 2026].
// Vitest, 2026a. Test API Reference. [online] Available at: <https://vitest.dev/api/> [Accessed 8 October 2026].
// Vitest, 2026b. expect. [online] Available at: <https://vitest.dev/api/expect.html> [Accessed 8 October 2026].
