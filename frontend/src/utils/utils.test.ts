import { describe, expect, it } from "vitest";
import { calcTax, estimateTax, taxYearStart, TAX_THRESHOLD } from "./tax.ts";
import { validateGigDraft } from "./gigValidation.ts";
import { validateEmail, validatePassword, validateUsername } from "./validation.ts";
import { money } from "./format.ts";
import { CATEGORIES } from "./categories.ts";

describe("tax estimate (SARS 2026/27)", () => {
  it("is zero at or below the tax threshold", () => {
    expect(calcTax(0)).toBe(0);
    expect(calcTax(TAX_THRESHOLD)).toBe(0);
    expect(estimateTax(50_000).belowThreshold).toBe(true);
  });
  it("applies the first bracket and the primary rebate", () => {
    expect(calcTax(245_100)).toBe(44_118 - 17_820);
  });
  it("applies higher brackets", () => {
    expect(calcTax(500_000)).toBe(79_998 + (500_000 - 383_100) * 0.31 - 17_820);
  });
  it("reports effective rate and after-tax income", () => {
    const e = estimateTax(245_100);
    expect(e.afterTax).toBe(245_100 - 26_298);
    expect(e.effectiveRate).toBeCloseTo(26_298 / 245_100, 6);
  });
  it("finds the start of the tax year", () => {
    expect(taxYearStart(new Date(2026, 9, 7)).getFullYear()).toBe(2026);
    expect(taxYearStart(new Date(2027, 0, 15)).getFullYear()).toBe(2026);
    expect(taxYearStart(new Date(2027, 0, 15)).getMonth()).toBe(2);
  });
});

// Worked examples with the answers written out by hand from the SARS table (South African Revenue Service, 2026).
// They do not reuse the formula from tax.ts, so a wrong bracket, rate or rebate figure would be caught.
describe("tax worked examples (SARS 2027 tax year)", () => {
  it("R80 000 is below the threshold, so no tax is payable", () => {
    // 18% of 80 000 is 14 400, which is less than the R17 820 rebate
    expect(calcTax(80_000)).toBe(0);
    expect(estimateTax(80_000).belowThreshold).toBe(true);
  });
  it("R99 000 is where the rebate stops covering the tax", () => {
    // 18% of 99 000 is exactly the R17 820 rebate, so one rand more owes 18 cents
    expect(calcTax(99_000)).toBe(0);
    expect(calcTax(99_001)).toBe(0.18);
  });
  it("R300 000 sits in the second bracket", () => {
    // 44 118 + 26% of (300 000 - 245 100) = 58 392, less the 17 820 rebate
    expect(calcTax(300_000)).toBe(40_572);
    const estimate = estimateTax(300_000);
    expect(estimate.afterTax).toBe(259_428);
    expect(estimate.effectiveRate).toBeCloseTo(0.1352, 4);
  });
  it("R1 000 000 sits in the sixth bracket", () => {
    // 259 783 + 41% of (1 000 000 - 887 000) = 306 113, less the 17 820 rebate
    expect(calcTax(1_000_000)).toBe(288_293);
  });
  it("the top bracket starts above R1 878 600 at 45%", () => {
    // 666 339 + 45% of (2 000 000 - 1 878 600) = 720 969, less the 17 820 rebate
    expect(calcTax(2_000_000)).toBe(703_149);
  });
});

describe("validation", () => {
  it("checks passwords against the backend rules", () => {
    expect(validatePassword("abc")).not.toBeNull();
    expect(validatePassword("alllowercase1!")).not.toBeNull();
    expect(validatePassword("Abcdefg1!")).toBeNull();
  });
  it("validates emails and usernames", () => {
    expect(validateEmail("a@b.co")).toBeNull();
    expect(validateEmail("not-an-email")).not.toBeNull();
    expect(validateUsername("x")).not.toBeNull();
    expect(validateUsername("Thandi")).toBeNull();
  });
  it("flags invalid gig drafts and accepts valid ones", () => {
    const bad = validateGigDraft(
      { title: "x", description: "short", category: "Nope", price: "0", deliveryTimeDays: "1.5" },
      CATEGORIES,
    );
    expect(Object.keys(bad).sort()).toEqual(["category", "deliveryTimeDays", "description", "price", "title"]);
    const ok = validateGigDraft(
      {
        title: "Logo design",
        description: "A full logo design with revisions.",
        category: "Graphic & Design",
        price: "1500",
        deliveryTimeDays: "5",
      },
      CATEGORIES,
    );
    expect(ok).toEqual({});
  });
});

describe("format", () => {
  it("formats rand", () => {
    expect(money(1500)).toBe("R 1 500");
    expect(money(1234.5)).toBe("R 1 234.50");
  });
});

// Reference List:
// South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 6 November 2026].
