// The freelancer's income and tax estimate on the dashboard, checked against the SARS tables.
const { test, expect } = require("@playwright/test");
const { env, loginAs, apiAs } = require("./helpers.js");

// The second test cancels the booking made in the first (Playwright, 2026).
test.describe.configure({ mode: "serial" });

// Finds one figure card inside the tax section by its exact label
const taxCard = (page, label) =>
  page
    .getByRole("region", { name: "Estimated tax" })
    .locator(".stat")
    .filter({ has: page.getByText(label, { exact: true }) });

const openTaxSummary = async (page) => {
  await loginAs(page, "taxfreelancer");
  await expect(page.getByRole("heading", { name: "Income and tax estimate" })).toBeVisible();
};

test.describe("Income and tax estimate", () => {
  // A client books the R300 000 gig, and the freelancer's dashboard shows the income, the tax and the after tax amount worked out by hand from the SARS table.
  test("a booking shows the correct income and tax on the freelancer's dashboard", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "client");
    await page.goto(`/gigs/${env("TEST_TAX_GIG_ID")}`);
    await page.getByLabel("Project brief").fill("Monthly bookkeeping for a bakery for one year.");
    await page.getByRole("button", { name: /Continue/ }).click();
    const booked = page.waitForResponse(
      (res) => res.url().endsWith("/api/bookings") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Confirm and pay" }).click();
    expect((await booked).status()).toBe(201);

    const context = await browser.newContext();
    const freelancer = await context.newPage();
    await openTaxSummary(freelancer);

    // R300 000 is in the second bracket: R44 118 + 26% of (R300 000 - R245 100) = R58 392,
    // less the R17 820 primary rebate gives R40 572 (South African Revenue Service, 2026).
    await expect(taxCard(freelancer, "Income this tax year")).toContainText("R 300 000");
    await expect(taxCard(freelancer, "Income this tax year")).toContainText("1 completed payment");
    await expect(taxCard(freelancer, "Estimated tax")).toContainText("R 40 572");
    await expect(taxCard(freelancer, "Estimated tax")).toContainText("13.5% of your income so far");
    await expect(taxCard(freelancer, "After tax")).toContainText("R 259 428");
    await expect(
      freelancer.getByRole("img", { name: "Estimated tax is 13.5% of income" })
    ).toBeVisible();
    await expect(freelancer.getByText("You are past the R 99 000 tax threshold")).toBeVisible();

    // The page shows the same figures the API calculated
    const estimate = (await (await apiAs(freelancer, "GET", "/transactions/tax-estimate")).json())
      .data;
    expect(estimate.income).toBe(300000);
    expect(estimate.tax).toBe(40572);
    expect(estimate.afterTax).toBe(259428);
    await context.close();
  });

  // The client cancels the booking, and the refunded payment no longer counts as income or tax.
  test("a cancelled booking is taken out of the income and tax", async ({ page, browser }) => {
    await loginAs(page, "client");
    await page.goto("/bookings");
    const item = page.locator("li").filter({ hasText: "Annual retainer" }).first();
    await item.getByRole("button", { name: "Cancel" }).click();
    await page
      .getByRole("alertdialog", { name: "Cancel booking" })
      .getByRole("button", { name: "Cancel booking" })
      .click();
    await expect(item).toContainText("Cancelled");

    const context = await browser.newContext();
    const freelancer = await context.newPage();
    await openTaxSummary(freelancer);

    await expect(taxCard(freelancer, "Income this tax year")).toContainText("R 0");
    await expect(taxCard(freelancer, "Income this tax year")).toContainText("0 completed payments");
    await expect(taxCard(freelancer, "Estimated tax")).toContainText(
      "No tax is estimated at or below R 99 000"
    );
    await context.close();
  });
});

// Reference List:
// Playwright, 2026. Parallelism. [online] Available at: <https://playwright.dev/docs/test-parallel> [Accessed 7 November 2026].
// South African Revenue Service, 2026. Rates of tax for individuals. [online] Available at: <https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/> [Accessed 11 October 2026].
