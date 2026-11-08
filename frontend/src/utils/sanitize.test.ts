import { describe, expect, it } from "vitest";
import { PATTERNS } from "./patterns.ts";
import {
  digitsOnly,
  liveClean,
  liveSearch,
  sanitizeDecimal,
  sanitizeEmail,
  sanitizeSearch,
  sanitizeText,
  sanitizeUsername,
} from "./sanitize.ts";

describe("sanitizeText", () => {
  it("removes script and HTML tags", () => {
    expect(sanitizeText("<script>alert(1)</script>Hello <b>you</b>")).toBe("alert(1)Hello you");
    expect(sanitizeText('<img src=x onerror="alert(1)">Hi')).toBe("Hi");
  });
  it("defeats nested payloads that rebuild themselves", () => {
    expect(sanitizeText("<scr<script>ipt>alert(1)</scr</script>ipt>")).not.toMatch(/<|>/);
  });
  it("keeps cleaning until a payload that needs three passes is gone", () => {
    // Removing "vbscript:" leaves "data  :", removing that leaves "javascript  :", and each step is a separate pass
    const cleaned = sanitizeText("javascript data vbscript: : :");
    expect(cleaned.includes("javascript")).toBe(false);
    expect(cleaned.includes(":")).toBe(false);
  });
  it("removes dangerous URL schemes and inline event handlers", () => {
    expect(sanitizeText("click javascript:alert(1)")).toBe("click alert(1)");
    expect(sanitizeText("x onclick=steal() y")).toBe("x steal() y");
  });
  it("removes control, zero-width and bidi override characters", () => {
    expect(sanitizeText("a\u0000b\u200Bc\u202Ed")).toBe("abcd");
  });
  it("collapses whitespace on one line and keeps paragraphs when multiline", () => {
    expect(sanitizeText("  a   b \n c ")).toBe("a b c");
    expect(sanitizeText("line1\n\n\n\nline2  x", { multiline: true })).toBe("line1\n\nline2 x");
  });
  it("respects a maximum length", () => {
    expect(sanitizeText("abcdef", { max: 3 })).toBe("abc");
  });
});

describe("field sanitisers", () => {
  it("cleans emails", () => {
    expect(sanitizeEmail("  Me@Example.COM <b> ")).toBe("me@example.com");
  });
  it("keeps only allowed username characters", () => {
    expect(sanitizeUsername("Thandi<script>")).toBe("Thandi");
    expect(sanitizeUsername("Sipho_D. O'Neil-Smith")).toBe("Sipho_D. O'Neil-Smith");
    expect(sanitizeUsername("a{$ne:1}")).toBe("ane1");
  });
  it("cleans search text", () => {
    expect(sanitizeSearch("<b>logo</b>; DROP TABLE")).toBe("logo DROP TABLE");
    expect(liveSearch("react<>{}$ fix")).toBe("react fix");
  });
  it("only allows numbers in numeric fields", () => {
    expect(digitsOnly("1a2b3c", 2)).toBe("12");
    expect(sanitizeDecimal("R1 250,5099")).toBe("1250.50");
    expect(sanitizeDecimal("12.3.4")).toBe("12.34");
  });
  it("blocks injection characters as they are typed", () => {
    expect(liveClean("a<b>{c}$d\\e`f")).toBe("abcdef");
  });
});

describe("regex whitelists", () => {
  it("username", () => {
    expect(PATTERNS.username.test("Thandi Mokoena")).toBe(true);
    expect(PATTERNS.username.test("x")).toBe(false);
    expect(PATTERNS.username.test("<b>bad</b>")).toBe(false);
  });
  it("gig title and description", () => {
    expect(PATTERNS.gigTitle.test("Brand identity kit: logo, palette & type")).toBe(true);
    expect(PATTERNS.gigTitle.test("Hi")).toBe(false);
    expect(PATTERNS.gigTitle.test("Title with <script>")).toBe(false);
    expect(PATTERNS.gigTitle.test("Line one\nLine two here")).toBe(false);
    expect(PATTERNS.gigDescription.test("A complete logo.\nIncludes two revisions.")).toBe(true);
    expect(PATTERNS.gigDescription.test("short")).toBe(false);
  });
  it("price and days", () => {
    expect(["1", "2500", "99.5", "1000000"].every((v) => PATTERNS.price.test(v))).toBe(true);
    expect(["0", "-5", "12.345", "abc", "01"].some((v) => PATTERNS.price.test(v))).toBe(false);
    expect(PATTERNS.days.test("5")).toBe(true);
    expect(PATTERNS.days.test("0")).toBe(false);
    expect(PATTERNS.days.test("100")).toBe(false);
  });
  it("object id, date and payment method", () => {
    expect(PATTERNS.objectId.test("64b7f0c2a1b2c3d4e5f60718")).toBe(true);
    expect(PATTERNS.objectId.test("../../etc/passwd")).toBe(false);
    expect(PATTERNS.objectId.test("g1")).toBe(false);
    expect(PATTERNS.isoDate.test("2026-10-31")).toBe(true);
    expect(PATTERNS.isoDate.test("2026-13-01")).toBe(false);
    expect(PATTERNS.paymentMethod.test("simulated_card")).toBe(true);
    expect(PATTERNS.paymentMethod.test("bitcoin")).toBe(false);
  });
});
