// The marketplace flow from gig to booking, transaction, delivery and income.
const { test, expect } = require("@playwright/test");
const { env, loginAs, apiAs } = require("./helpers.js");

// Each test needs the one before it (Playwright, 2026a).
test.describe.configure({ mode: "serial" });

test.describe("Marketplace flow", () => {
  let gigTitle;
  let reference;

  test.beforeAll(() => {
    gigTitle = `Playwright logo pack ${env("TEST_RUN_ID")}`;
  });

  // The freelancer fills in the gig editor and publishes it, then checks the API saved it and it is listed under My gigs.
  test("a freelancer creates a gig and it appears under My gigs", async ({ page }) => {
    await loginAs(page, "freelancer");
    await page.getByRole("link", { name: "My gigs", exact: true }).click();
    await page.goto("/my-gigs/new");

    await page.locator("#ed-title").fill(gigTitle);
    await page.locator("#ed-cat").selectOption("Graphic & Design");
    await page
      .locator("#ed-desc")
      .fill("A logo, a colour palette and a short brand guide for a small business.");
    await page.locator("#ed-price").fill("1500");
    await page.locator("#ed-days").fill("4");

    const saved = page.waitForResponse(
      (res) => res.url().endsWith("/api/gigs") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Publish gig" }).click();
    expect((await saved).status()).toBe(201);

    await expect(page).toHaveURL(/\/my-gigs$/);
    await expect(page.getByText(gigTitle).first()).toBeVisible();
  });

  // The client searches for the new gig, books it with a simulated payment, and checks the receipt shows the transaction reference from the API.
  test("a client finds the gig, books it and gets a transaction receipt", async ({ page }) => {
    await loginAs(page, "client");
    await page.getByRole("link", { name: "Explore", exact: true }).click();
    await expect(page).toHaveURL(/\/explore$/);

    await page.getByLabel("Search gigs").fill(gigTitle);
    await page
      .getByRole("button", { name: new RegExp(gigTitle) })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: gigTitle })).toBeVisible();

    await page
      .getByLabel("Project brief")
      .fill("A logo for a coffee shop in Cape Town, delivered as SVG and PNG.");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("heading", { name: "Review and pay" })).toBeVisible();

    const booked = page.waitForResponse(
      (res) => res.url().endsWith("/api/bookings") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Confirm and pay" }).click();
    const response = await booked;
    expect(response.status()).toBe(201);
    reference = (await response.json()).data.transaction.reference;

    const receipt = page.getByRole("status").filter({ hasText: "You're booked." });
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(reference);
    await expect(receipt).toContainText("R 1 500");
  });

  // Checks the client's Bookings page shows the booked gig and its transaction reference.
  test("the client's bookings page lists the booking and its transaction", async ({ page }) => {
    await loginAs(page, "client");
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your bookings" })).toBeVisible();
    await expect(page.getByText(gigTitle).first()).toBeVisible();
    await expect(page.getByText(reference)).toBeVisible();
  });

  // Checks the freelancer's Bookings page shows the booking and the dashboard shows the income and tax estimate.
  test("the freelancer sees the booking and the income and tax estimate", async ({ page }) => {
    await loginAs(page, "freelancer");
    await page.getByRole("link", { name: "Bookings", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
    await expect(page.getByText(gigTitle).first()).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Total income")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Income and tax estimate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Estimated tax" })).toBeVisible();
  });

  // The freelancer moves the booking to in progress and then delivered, and the client sees it delivered with no cancel option.
  test("the freelancer starts and delivers the work, and the client sees it delivered", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "freelancer");
    await page.goto("/bookings");
    const row = page.locator("tr").filter({ hasText: reference });

    await row.getByRole("button", { name: "Start work" }).click();
    await expect(row).toContainText("In progress");
    await row.getByRole("button", { name: "Mark delivered" }).click();
    await expect(row).toContainText("Delivered");

    // A second context logs the client in separately (Playwright, 2026b).
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    await loginAs(clientPage, "client");
    await clientPage.goto("/bookings");
    await expect(clientPage.locator("li").filter({ hasText: gigTitle }).first()).toContainText(
      "Delivered"
    );
    await expect(
      clientPage.locator("li").filter({ hasText: gigTitle }).first().getByRole("button", {
        name: "Cancel",
      })
    ).toHaveCount(0);
    await clientContext.close();
  });

  // The client books a second gig and cancels it, then checks the API shows its transaction as refunded.
  test("a client cancels a booking and its transaction is refunded", async ({ page }) => {
    await loginAs(page, "client");
    await page.goto(`/gigs/${env("TEST_SECOND_GIG_ID")}`);
    await page.getByLabel("Project brief").fill("Please review my plan for a small bakery.");
    await page.getByRole("button", { name: /Continue/ }).click();
    const booked = page.waitForResponse(
      (res) => res.url().endsWith("/api/bookings") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Confirm and pay" }).click();
    const bookingId = (await (await booked).json()).data.booking._id;

    await page.goto("/bookings");
    const item = page.locator("li").filter({ hasText: "Business plan review" }).first();
    await item.getByRole("button", { name: "Cancel" }).click();
    await page
      .getByRole("alertdialog", { name: "Cancel booking" })
      .getByRole("button", { name: "Cancel booking" })
      .click();
    await expect(item).toContainText("Cancelled");

    const response = await apiAs(page, "GET", "/transactions");
    expect(response.status()).toBe(200);
    const transactions = (await response.json()).data;
    const refunded = transactions.find(
      (txn) => String(txn.bookingId?._id ?? txn.bookingId) === bookingId
    );
    expect(refunded.status).toBe("refunded");
  });

  // Logs in as the admin and checks the overview lists both bookings made by the client.
  test("an admin sees the bookings from every user", async ({ page }) => {
    await loginAs(page, "admin");
    await page.getByRole("link", { name: "Admin", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Admin overview" })).toBeVisible();
    await expect(page.getByText("Transaction volume")).toBeVisible();
    await expect(page.getByText(gigTitle).first()).toBeVisible();
    await expect(page.getByText(/Business plan review/).first()).toBeVisible();
  });
});

// Reference List:
// Playwright, 2026a. Parallelism. [online] Available at: <https://playwright.dev/docs/test-parallel> [Accessed 7 November 2026].
// Playwright, 2026b. Isolation. [online] Available at: <https://playwright.dev/docs/browser-contexts> [Accessed 7 November 2026].
