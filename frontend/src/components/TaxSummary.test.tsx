import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxSummary } from "./TaxSummary.tsx";
import { ApiError } from "../services/api.ts";
import { getTaxEstimate } from "../services/marketApi.ts";
import type { TaxEstimate } from "../models/market.ts";
import { dlong, money } from "../utils/format.ts";

vi.mock("../services/marketApi.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/marketApi.ts")>()),
  getTaxEstimate: vi.fn(),
}));

// The year is named the way SARS names it: "2027 tax year (1 March 2026 – 28 February 2027)" (South African Revenue Service, 2026).
const belowThreshold: TaxEstimate = {
  taxYear: { label: "2027 tax year", startsOn: "2026-03-01", endsOn: "2027-02-28" },
  rates: { label: "2027 tax year", outOfDate: false },
  currency: "ZAR",
  income: 91000,
  paymentCount: 7,
  tax: 0,
  effectiveRate: 0,
  afterTax: 91000,
  belowThreshold: true,
  bracket: { from: 0, upTo: 245100, rate: 0.18 },
  insights: {
    projectedAnnualIncome: 182500,
    projectedAnnualTax: 15030,
    setAsidePercent: 8.2,
    setAsidePerThousand: 82.4,
    threshold: { amount: 99000, progressPercent: 91.9, remaining: 8000, reached: false },
    nextBracket: { startsAt: 245100, rate: 0.26, remaining: 154100 },
    basis: { method: "straight line from the income so far", daysElapsed: 182, daysInYear: 365 },
  },
  disclaimer: "Estimate only, not tax advice.",
};

const aboveThreshold: TaxEstimate = {
  ...belowThreshold,
  income: 300000,
  paymentCount: 1,
  tax: 40572,
  effectiveRate: 0.1352,
  afterTax: 259428,
  belowThreshold: false,
  bracket: { from: 245100, upTo: 383100, rate: 0.26 },
  insights: {
    ...belowThreshold.insights,
    threshold: { amount: 99000, progressPercent: 100, remaining: 0, reached: true },
    nextBracket: { startsAt: 383100, rate: 0.31, remaining: 83100 },
  },
};

describe("TaxSummary", () => {
  beforeEach(() => {
    vi.mocked(getTaxEstimate).mockReset();
  });

  it("shows a loading state first and then the figures from the API", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Income and tax estimate" })).toBeInTheDocument();
    expect(screen.getByText("Income this tax year")).toBeInTheDocument();
    // The header names the year as SARS does and shows its real dates (South African Revenue Service, 2026).
    expect(screen.getByText(`2027 tax year | ${dlong("2026-03-01")} to ${dlong("2027-02-28")}`)).toBeInTheDocument();
    expect(screen.getByText("Before tax, from 7 completed payments")).toBeInTheDocument();
  });

  it("says no tax is estimated at or below the threshold", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    expect(await screen.findByText(`No tax is estimated at or below ${money(99000)}`)).toBeInTheDocument();
    expect(screen.getByText(`${money(8000)} to go to the ${money(99000)} tax threshold`)).toBeInTheDocument();
  });

  it("shows the projection, the amount to set aside and the next bracket", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    await screen.findByText("Projected tax this year");

    expect(screen.getByText(money(15030))).toBeInTheDocument();
    expect(
      screen.getByText(`If you keep this pace, on about ${money(182500)} of income`, { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(money(82.4))).toBeInTheDocument();
    expect(screen.getByText("about 8.2% of each payment", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(`26% from ${money(245100)}`)).toBeInTheDocument();
    expect(screen.getByText(`${money(154100)} to go`)).toBeInTheDocument();
  });

  it("shows the threshold progress as an accessible progress bar", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    const bar = await screen.findByRole("progressbar", { name: "Progress towards the tax threshold" });
    expect(bar).toHaveAttribute("aria-valuenow", "91.9");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("shows tax and the effective rate once the threshold has been passed", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(aboveThreshold);
    render(<TaxSummary />);
    expect(await screen.findByText("13.5% of your income so far")).toBeInTheDocument();
    expect(screen.getByText(money(40572))).toBeInTheDocument();
    expect(screen.getByText(`You are past the ${money(99000)} tax threshold`)).toBeInTheDocument();
    expect(screen.getByText(`31% from ${money(383100)}`)).toBeInTheDocument();
    // A single payment is written in the singular
    expect(screen.getByText("Before tax, from 1 completed payment")).toBeInTheDocument();
  });

  it("names the top bracket when there is no higher one", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue({
      ...aboveThreshold,
      bracket: { from: 1878600, upTo: null, rate: 0.45 },
      insights: { ...aboveThreshold.insights, nextBracket: null },
    });
    render(<TaxSummary />);
    expect(await screen.findByText("Top bracket, 45%")).toBeInTheDocument();
    expect(screen.getByText("There is no higher bracket")).toBeInTheDocument();
  });

  it("warns when the rates are for an earlier tax year", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue({
      ...belowThreshold,
      taxYear: { label: "2028 tax year", startsOn: "2027-03-01", endsOn: "2028-02-29" },
      rates: { label: "2027 tax year", outOfDate: true },
    });
    render(<TaxSummary />);
    expect(
      await screen.findByText(
        "These figures use the SARS rates for the 2027 tax year, which may be out of date for the 2028 tax year.",
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
  });

  it("does not warn when the rates match the tax year", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    await screen.findByText("Projected tax this year");
    expect(screen.queryByText("may be out of date", { exact: false })).not.toBeInTheDocument();
  });

  it("states that it is an estimate and only as reliable as the pace so far", async () => {
    vi.mocked(getTaxEstimate).mockResolvedValue(belowThreshold);
    render(<TaxSummary />);
    expect(await screen.findByText("Estimate only, not tax advice.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("only as reliable as that pace", { exact: false })).toBeInTheDocument();
  });

  it("shows an error and lets the user try again", async () => {
    vi.mocked(getTaxEstimate)
      .mockRejectedValueOnce(new ApiError("Something went wrong on our side. Please try again shortly.", [], 500))
      .mockResolvedValue(aboveThreshold);
    render(<TaxSummary />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(getTaxEstimate).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "Income and tax estimate" })).toBeInTheDocument();
  });
});

// Reference List:
// South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 6 November 2026].
// Testing Library, 2026c. About Queries. [online] Available at: <https://testing-library.com/docs/queries/about/> [Accessed 10 October 2026].
