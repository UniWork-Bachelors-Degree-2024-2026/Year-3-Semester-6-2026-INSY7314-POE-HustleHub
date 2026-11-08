const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TAX_TABLES,
  taxYearStartYear,
  taxYearBounds,
  tableFor,
  calculateTax,
  estimateTax,
  buildInsights,
  buildTaxEstimate,
} = require("../utils/tax.js");

// Every expected figure below is worked out by hand from the SARS table (South African Revenue Service, 2026).
const table = TAX_TABLES[2026];

test("each bracket starts with the tax owed on everything below it", () => {
  // The base of a bracket must equal the previous base plus the previous rate on its width
  for (let i = 1; i < table.brackets.length; i += 1) {
    const previous = table.brackets[i - 1];
    const expectedBase = previous.base + (previous.upTo - previous.from) * previous.rate;
    assert.equal(Math.round(expectedBase), table.brackets[i].base);
    assert.equal(table.brackets[i].from, previous.upTo);
  }
});

test("R80 000 is below the threshold so no tax is owed", () => {
  // 18% of 80 000 is 14 400, which is less than the R17 820 rebate
  assert.equal(calculateTax(80000, table), 0);
  assert.equal(estimateTax(80000, table).belowThreshold, true);
});

test("R99 000 is where the rebate stops covering the tax", () => {
  // 18% of 99 000 is exactly the R17 820 rebate, so one rand more owes 18 cents
  assert.equal(calculateTax(99000, table), 0);
  assert.equal(calculateTax(99001, table), 0.18);
});

test("worked examples in the second, sixth and top brackets", () => {
  // 44 118 + 26% of (300 000 - 245 100) = 58 392, less the 17 820 rebate
  assert.equal(calculateTax(300000, table), 40572);
  // 259 783 + 41% of (1 000 000 - 887 000) = 306 113, less the 17 820 rebate
  assert.equal(calculateTax(1000000, table), 288293);
  // 666 339 + 45% of (2 000 000 - 1 878 600) = 720 969, less the 17 820 rebate
  assert.equal(calculateTax(2000000, table), 703149);
});

test("no income, negative income and non numbers owe nothing", () => {
  assert.equal(calculateTax(0, table), 0);
  assert.equal(calculateTax(-500, table), 0);
  assert.equal(calculateTax(Number.NaN, table), 0);
});

test("the estimate reports the effective rate and the income after tax", () => {
  const estimate = estimateTax(300000, table);
  assert.equal(estimate.tax, 40572);
  assert.equal(estimate.afterTax, 259428);
  // 40 572 / 300 000 is 13.524 percent
  assert.equal(estimate.effectiveRate, 0.1352);
});

test("a tax year starts on 1 March and ends with February", () => {
  assert.equal(taxYearStartYear(new Date("2026-03-01T00:00:00Z")), 2026);
  assert.equal(taxYearStartYear(new Date("2026-02-28T23:59:59Z")), 2025);
  assert.equal(taxYearStartYear(new Date("2027-02-28T12:00:00Z")), 2026);
  assert.equal(taxYearStartYear(new Date("2027-03-01T00:00:00Z")), 2027);

  const bounds = taxYearBounds(2026);
  assert.equal(bounds.start.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2027-03-01T00:00:00.000Z");
});

test("a year without a table uses the newest rates and says they may be out of date", () => {
  assert.equal(tableFor(2026).ratesOutOfDate, false);
  const later = tableFor(2027);
  assert.equal(later.ratesOutOfDate, true);
  assert.equal(later.table.label, "2027 tax year");
});

test("a year with no table is named by SARS's rule and flagged, while the rates stay the newest", () => {
  // 10 March 2027 starts the tax year that ends in 2028, and only the 2027 tax year rates are known
  const estimate = buildTaxEstimate({
    income: 50000,
    paymentCount: 3,
    now: new Date("2027-03-10T00:00:00Z"),
  });
  assert.equal(estimate.taxYear.label, "2028 tax year");
  assert.equal(estimate.taxYear.startsOn, "2027-03-01");
  assert.equal(estimate.taxYear.endsOn, "2028-02-29");
  assert.deepEqual(estimate.rates, { label: "2027 tax year", outOfDate: true });
});

test("insights project the year from the pace so far", () => {
  const bounds = taxYearBounds(2026);
  // 1 March to 30 August is 182 days of 365, and R91 000 in 182 days is R500 a day
  const now = new Date("2026-08-30T00:00:00Z");
  const insights = buildInsights({ income: 91000, now, bounds, table });

  // 500 a day for 365 days is 182 500, and 18% of that less the rebate is 32 850 - 17 820
  assert.equal(insights.projectedAnnualIncome, 182500);
  assert.equal(insights.projectedAnnualTax, 15030);
  assert.equal(insights.setAsidePercent, 8.2);
  assert.equal(insights.setAsidePerThousand, 82.4);

  // 91 000 is 91.9 percent of the R99 000 threshold, with R8 000 to go
  assert.equal(insights.threshold.progressPercent, 91.9);
  assert.equal(insights.threshold.remaining, 8000);
  assert.equal(insights.threshold.reached, false);

  // The next bracket is 26% from R245 100, which is R154 100 away
  assert.deepEqual(insights.nextBracket, { startsAt: 245100, rate: 0.26, remaining: 154100 });
  assert.equal(insights.basis.daysElapsed, 182);
  assert.equal(insights.basis.daysInYear, 365);
});

test("early in the year the projection uses at least 30 days of pace", () => {
  const bounds = taxYearBounds(2026);
  // Only 4 days have passed, so 10 000 is treated as 30 days of income: 10 000 x 365 / 30
  const insights = buildInsights({
    income: 10000,
    now: new Date("2026-03-05T00:00:00Z"),
    bounds,
    table,
  });
  assert.equal(insights.projectedAnnualIncome, 121666.67);
});

test("no income gives a zero projection and nothing to set aside", () => {
  const bounds = taxYearBounds(2026);
  const insights = buildInsights({
    income: 0,
    now: new Date("2026-06-01T00:00:00Z"),
    bounds,
    table,
  });
  assert.equal(insights.projectedAnnualIncome, 0);
  assert.equal(insights.setAsidePercent, 0);
  assert.equal(insights.threshold.progressPercent, 0);
  assert.equal(insights.threshold.remaining, 99000);
});

test("the top bracket has no next bracket and a JSON safe upper limit", () => {
  const estimate = buildTaxEstimate({
    income: 2000000,
    paymentCount: 40,
    now: new Date("2026-10-01T00:00:00Z"),
  });
  assert.equal(estimate.bracket.upTo, null);
  assert.equal(estimate.insights.nextBracket, null);
  // The whole estimate must survive JSON, where Infinity would turn into null
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(estimate)));
});

test("the full estimate describes the tax year and the figures", () => {
  const estimate = buildTaxEstimate({
    income: 300000,
    paymentCount: 12,
    now: new Date("2026-10-01T00:00:00Z"),
  });
  assert.deepEqual(estimate.taxYear, {
    label: "2027 tax year",
    startsOn: "2026-03-01",
    endsOn: "2027-02-28",
  });
  assert.deepEqual(estimate.rates, { label: "2027 tax year", outOfDate: false });
  assert.equal(estimate.currency, "ZAR");
  assert.equal(estimate.paymentCount, 12);
  assert.equal(estimate.tax, 40572);
  assert.equal(estimate.belowThreshold, false);
  assert.deepEqual(estimate.bracket, { from: 245100, upTo: 383100, rate: 0.26 });
  assert.ok(estimate.disclaimer.includes("not tax advice"));
});

// Reference List:
// South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 6 November 2026].
