// Estimated income tax from the SARS individuals' tax table, the primary rebate and the under 65 threshold.
// SARS lists every tax year from 1 March to the end of February, for example "2027 tax year (1 March 2026 – 28 February 2027)" (South African Revenue Service, 2026).

// The key is the calendar year in which the tax year starts, and the label is the name SARS gives that year.
const TAX_TABLES = Object.freeze({
  2026: Object.freeze({
    label: "2027 tax year",
    // The primary rebate and the under 65 tax threshold as listed by SARS (South African Revenue Service, 2026).
    primaryRebate: 17820,
    taxThreshold: 99000,
    // The first bracket is a flat 18%, the others are a base amount plus a percentage of the income above their lower limit (South African Revenue Service, 2026).
    brackets: Object.freeze([
      Object.freeze({ from: 0, upTo: 245100, base: 0, rate: 0.18 }),
      Object.freeze({ from: 245100, upTo: 383100, base: 44118, rate: 0.26 }),
      Object.freeze({ from: 383100, upTo: 530200, base: 79998, rate: 0.31 }),
      Object.freeze({ from: 530200, upTo: 695800, base: 125599, rate: 0.36 }),
      Object.freeze({ from: 695800, upTo: 887000, base: 185215, rate: 0.39 }),
      Object.freeze({ from: 887000, upTo: 1878600, base: 259783, rate: 0.41 }),
      Object.freeze({ from: 1878600, upTo: Infinity, base: 666339, rate: 0.45 }),
    ]),
  }),
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A projection from fewer days than this would swing wildly on one payment, so it is based on 30 days at least.
const MIN_DAYS_FOR_PROJECTION = 30;

const round2 = (value) => Math.round(value * 100) / 100;
const round1 = (value) => Math.round(value * 10) / 10;
const round4 = (value) => Math.round(value * 10000) / 10000;

// The calendar year in which the tax year containing the date starts. Dates are read in UTC.
const taxYearStartYear = (date) => {
  const year = date.getUTCFullYear();
  if (date.getUTCMonth() >= 2) {
    return year;
  }
  return year - 1;
};

// The first moment of the tax year and the first moment after it (the end is not part of the year).
const taxYearBounds = (startYear) => ({
  start: new Date(Date.UTC(startYear, 2, 1)),
  end: new Date(Date.UTC(startYear + 1, 2, 1)),
});

// Picks the table for a tax year, or the newest one with a flag when that year has no table yet.
const tableFor = (startYear) => {
  const exact = TAX_TABLES[startYear];
  if (exact) {
    return { table: exact, ratesOutOfDate: false };
  }
  const newest = Math.max(...Object.keys(TAX_TABLES).map(Number));
  return { table: TAX_TABLES[newest], ratesOutOfDate: true };
};

// The bracket a taxable income falls in, the top bracket when it is above every limit.
const bracketFor = (income, table) => {
  const found = table.brackets.find((bracket) => income <= bracket.upTo);
  return found || table.brackets[table.brackets.length - 1];
};

// Tax payable after the primary rebate, never negative and rounded to the cent.
const calculateTax = (income, table) => {
  if (!Number.isFinite(income) || income <= 0) {
    return 0;
  }
  const bracket = bracketFor(income, table);
  const gross = bracket.base + (income - bracket.from) * bracket.rate;
  return Math.max(0, round2(gross - table.primaryRebate));
};

// Tax, effective rate and after tax income for one income figure.
const estimateTax = (income, table) => {
  const tax = calculateTax(income, table);
  let effectiveRate = 0;
  if (income > 0) {
    effectiveRate = round4(tax / income);
  }
  return {
    income: round2(income),
    tax,
    effectiveRate,
    afterTax: round2(income - tax),
    // At or below the threshold this calculation gives no tax, because 18% of R99 000 is exactly the rebate
    belowThreshold: income <= table.taxThreshold,
    bracket: bracketFor(income, table),
  };
};

// Whole days between two dates, as a fraction.
const daysBetween = (from, to) => (to.getTime() - from.getTime()) / MS_PER_DAY;

// Plain language figures built from the income so far: a projection for the year, how close the
// tax threshold is, how much to set aside, and where the next bracket starts.
const buildInsights = ({ income, now, bounds, table }) => {
  const daysInYear = daysBetween(bounds.start, bounds.end);
  const daysElapsed = Math.min(daysInYear, Math.max(0, daysBetween(bounds.start, now)));
  const basisDays = Math.max(daysElapsed, MIN_DAYS_FOR_PROJECTION);

  // The projection continues the pace of the year so far in a straight line
  const projectedIncome = round2(income * (daysInYear / basisDays));
  const projected = estimateTax(projectedIncome, table);

  const current = bracketFor(income, table);
  const index = table.brackets.indexOf(current);
  const following = table.brackets[index + 1];
  let nextBracket = null;
  if (following) {
    nextBracket = {
      startsAt: current.upTo,
      rate: following.rate,
      remaining: round2(current.upTo - income),
    };
  }

  return {
    projectedAnnualIncome: projectedIncome,
    projectedAnnualTax: projected.tax,
    setAsidePercent: round1(projected.effectiveRate * 100),
    setAsidePerThousand: round2(1000 * projected.effectiveRate),
    threshold: {
      amount: table.taxThreshold,
      progressPercent: Math.min(100, round1((income / table.taxThreshold) * 100)),
      remaining: Math.max(0, round2(table.taxThreshold - income)),
      reached: income > table.taxThreshold,
    },
    nextBracket,
    basis: {
      method: "straight line from the income so far",
      daysElapsed: Math.floor(daysElapsed),
      daysInYear: Math.round(daysInYear),
    },
  };
};

// The whole estimate for a tax year: the year itself, the figures and the insights.
const buildTaxEstimate = ({ income, paymentCount, now }) => {
  const startYear = taxYearStartYear(now);
  const bounds = taxYearBounds(startYear);
  const { table, ratesOutOfDate } = tableFor(startYear);
  const estimate = estimateTax(income, table);
  const lastDay = new Date(bounds.end.getTime() - MS_PER_DAY);

  let bracketTop = null;
  if (Number.isFinite(estimate.bracket.upTo)) {
    bracketTop = estimate.bracket.upTo;
  }

  return {
    taxYear: {
      // SARS names a tax year after the year it ends in, so the year starting in 2026 is the "2027 tax year"
      label: `${startYear + 1} tax year`,
      startsOn: bounds.start.toISOString().slice(0, 10),
      endsOn: lastDay.toISOString().slice(0, 10),
    },
    rates: { label: table.label, outOfDate: ratesOutOfDate },
    currency: "ZAR",
    income: estimate.income,
    paymentCount,
    tax: estimate.tax,
    effectiveRate: estimate.effectiveRate,
    afterTax: estimate.afterTax,
    belowThreshold: estimate.belowThreshold,
    bracket: { from: estimate.bracket.from, upTo: bracketTop, rate: estimate.bracket.rate },
    insights: buildInsights({ income, now, bounds, table }),
    disclaimer:
      "Estimate only, not tax advice. It treats HustleHub+ income as your total taxable income and " +
      "ignores deductions, other income, credits and provisional tax rules.",
  };
};

module.exports = {
  TAX_TABLES,
  taxYearStartYear,
  taxYearBounds,
  tableFor,
  calculateTax,
  estimateTax,
  buildInsights,
  buildTaxEstimate,
};

// Reference List:
// South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 6 November 2026].
