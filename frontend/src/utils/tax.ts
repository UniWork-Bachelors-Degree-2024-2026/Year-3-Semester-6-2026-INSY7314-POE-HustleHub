//South African Revenue Service (2026) publishes the 2026/27 tax rates, rebate and threshold which assisted this implementation.
// Estimated South African income tax for individuals under 65.
// Source: SARS statutory rates, 2026/2027 tax year (1 March 2026 - 28 February 2027).
// This is an ESTIMATE for planning only. It treats income earned on the platform
// as the taxable income for the year and ignores deductions, other income and credits.

export interface Bracket {
  upTo: number;
  base: number;
  rate: number;
  from: number;
}

export const TAX_YEAR_LABEL = "2026/27";
export const PRIMARY_REBATE = 17_820;
export const TAX_THRESHOLD = 99_000;

export const BRACKETS: Bracket[] = [
  { from: 0, upTo: 245_100, base: 0, rate: 0.18 },
  { from: 245_100, upTo: 383_100, base: 44_118, rate: 0.26 },
  { from: 383_100, upTo: 530_200, base: 79_998, rate: 0.31 },
  { from: 530_200, upTo: 695_800, base: 125_599, rate: 0.36 },
  { from: 695_800, upTo: 887_000, base: 185_215, rate: 0.39 },
  { from: 887_000, upTo: 1_878_600, base: 259_783, rate: 0.41 },
  { from: 1_878_600, upTo: Infinity, base: 666_339, rate: 0.45 },
];

/** Tax payable on a given taxable income, after the primary rebate. Never negative. */
export function calcTax(taxableIncome: number): number {
  if (!Number.isFinite(taxableIncome) || taxableIncome <= 0) return 0;
  const b = BRACKETS.find((x) => taxableIncome <= x.upTo) ?? BRACKETS[BRACKETS.length - 1];
  const gross = b.base + (taxableIncome - b.from) * b.rate;
  return Math.max(0, Math.round((gross - PRIMARY_REBATE) * 100) / 100);
}

export interface TaxEstimate {
  income: number;
  tax: number;
  effectiveRate: number;
  afterTax: number;
  belowThreshold: boolean;
}

export function estimateTax(income: number): TaxEstimate {
  const tax = calcTax(income);
  return {
    income,
    tax,
    effectiveRate: income > 0 ? tax / income : 0,
    afterTax: income - tax,
    belowThreshold: income <= TAX_THRESHOLD,
  };
}

/** Start of the SARS tax year (1 March) that contains the given date. */
export function taxYearStart(now: Date): Date {
  const y = now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(y, 2, 1);
}

//Reference List
//South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 11 October 2026].
