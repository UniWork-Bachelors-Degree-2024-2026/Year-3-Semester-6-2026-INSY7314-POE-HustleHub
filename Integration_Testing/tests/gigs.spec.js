// A freelancer editing and deleting their own gig through the My gigs page.
const { test, expect } = require("@playwright/test");
const { env, loginAs, apiAs } = require("./helpers.js");

// Each test needs the one before it (Playwright, 2026).
test.describe.configure({ mode: "serial" });

test.describe("Gig management", () => {
  let gigId;
  let gigTitle;

  test.beforeAll(() => {
    gigTitle = `Menu design ${env("TEST_RUN_ID")}`;
  });

  // The freelancer creates a gig, changes its price and delivery time in the editor, and checks the list and the API show the new values.
  test("a freelancer edits their gig and the changes are saved", async ({ page }) => {
    await loginAs(page, "freelancer");
    const created = await apiAs(page, "POST", "/gigs", {
      title: gigTitle,
      description: "A one page food and drinks menu designed for print and for social media.",
      category: "Graphic & Design",
      price: 1200,
      deliveryTimeDays: 5,
      status: "active",
    });
    expect(created.status()).toBe(201);
    gigId = (await created.json()).data._id;

    await page.goto("/my-gigs");
    await page.getByRole("button", { name: `Edit ${gigTitle}` }).click();
    await expect(page).toHaveURL(new RegExp(`/my-gigs/${gigId}/edit$`));
    await expect(page.getByRole("heading", { name: "Edit gig" })).toBeVisible();
    await expect(page.locator("#ed-price")).toHaveValue("1200");

    await page.locator("#ed-price").fill("1850");
    await page.locator("#ed-days").fill("7");
    const saved = page.waitForResponse(
      (res) => res.url().endsWith(`/api/gigs/${gigId}`) && res.request().method() === "PUT"
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    expect((await saved).status()).toBe(200);

    await expect(page).toHaveURL(/\/my-gigs$/);
    const row = page.locator(".gigrow").filter({ hasText: gigTitle });
    await expect(row).toContainText("R 1 850");
    await expect(row).toContainText("7 days");

    const stored = (await (await apiAs(page, "GET", `/gigs/${gigId}`)).json()).data;
    expect(stored.price).toBe(1850);
    expect(stored.deliveryTimeDays).toBe(7);
  });

  // The freelancer deletes the gig after confirming, and checks it leaves the list and the API no longer finds it.
  test("a freelancer deletes their gig after confirming", async ({ page }) => {
    await loginAs(page, "freelancer");
    await page.goto("/my-gigs");
    await page.getByRole("button", { name: `Delete ${gigTitle}` }).click();

    // Nothing is deleted until the freelancer confirms
    const dialog = page.getByRole("alertdialog", { name: "Delete gig" });
    await expect(dialog).toContainText(gigTitle);
    await dialog.getByRole("button", { name: "Keep it" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText(gigTitle)).toBeVisible();

    await page.getByRole("button", { name: `Delete ${gigTitle}` }).click();
    const deleted = page.waitForResponse(
      (res) => res.url().endsWith(`/api/gigs/${gigId}`) && res.request().method() === "DELETE"
    );
    await dialog.getByRole("button", { name: "Delete" }).click();
    expect((await deleted).status()).toBe(200);

    await expect(page.getByText(gigTitle)).toHaveCount(0);
    expect((await apiAs(page, "GET", `/gigs/${gigId}`)).status()).toBe(404);
  });
});

// Reference List:
// Playwright, 2026. Parallelism. [online] Available at: <https://playwright.dev/docs/test-parallel> [Accessed 7 November 2026].
