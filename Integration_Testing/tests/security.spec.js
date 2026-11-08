// Access control, output encoding and security headers.
const { test, expect } = require("@playwright/test");
const { env, loginAs, apiAs } = require("./helpers.js");

test.describe("Security controls", () => {
  // Checks a client has no My gigs link and gets the access denied page when opening the gig editor.
  test("a client cannot open the freelancer pages", async ({ page }) => {
    await loginAs(page, "client");
    await expect(page.getByRole("link", { name: "My gigs", exact: true })).toHaveCount(0);

    await page.goto("/my-gigs/new");
    await expect(
      page.getByRole("heading", { name: "This page isn't available for your account." })
    ).toBeVisible();
    await expect(page.locator("#ed-title")).toHaveCount(0);
  });

  // Checks a client gets the access denied page for /admin and a 403 from the freelancer only API endpoints.
  test("a client cannot open the admin page or call freelancer only endpoints", async ({
    page,
  }) => {
    await loginAs(page, "client");
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "This page isn't available for your account." })
    ).toBeVisible();

    // The API enforces this too (OWASP Foundation, 2026a).
    expect((await apiAs(page, "GET", "/transactions/tax-estimate")).status()).toBe(403);
    expect((await apiAs(page, "GET", "/transactions/income-summary")).status()).toBe(403);
    expect((await apiAs(page, "GET", "/gigs/my-gigs")).status()).toBe(403);
  });

  // Changes the client's saved role to freelancer in the browser and checks the API still answers 403.
  test("changing the stored role in the browser does not get past the API", async ({ page }) => {
    await loginAs(page, "client");
    await page.evaluate(() => {
      const user = JSON.parse(sessionStorage.getItem("hh_user"));
      sessionStorage.setItem("hh_user", JSON.stringify({ ...user, role: "freelancer" }));
    });

    // The role comes from the signed token, not the browser (OWASP Foundation, 2026a).
    const refused = page.waitForResponse((res) => res.url().includes("/api/gigs/my-gigs"));
    await page.goto("/my-gigs");
    expect((await refused).status()).toBe(403);
    await expect(page.getByRole("alert")).toBeVisible();
  });

  // A second freelancer opens the editor for the main freelancer's gig and tries to change and delete it through the API, then checks the gig is unchanged.
  test("a freelancer cannot edit or delete another freelancer's gig", async ({ page }) => {
    const gigId = env("TEST_OWNED_GIG_ID");
    await loginAs(page, "otherfreelancer");

    await page.goto(`/my-gigs/${gigId}/edit`);
    await expect(
      page.getByRole("heading", { name: "This page isn't available for your account." })
    ).toBeVisible();
    await expect(page.locator("#ed-title")).toHaveCount(0);

    // Ownership is checked on the server, not only hidden in the page (OWASP Foundation, 2026a).
    expect((await apiAs(page, "PUT", `/gigs/${gigId}`, { price: 1 })).status()).toBe(403);
    expect((await apiAs(page, "DELETE", `/gigs/${gigId}`)).status()).toBe(403);
    const gig = (await (await apiAs(page, "GET", `/gigs/${gigId}`)).json()).data;
    expect(gig.price).toBe(900);

    // Only clients book gigs
    expect((await apiAs(page, "POST", "/bookings", { gigId })).status()).toBe(403);
  });

  // The main client books a gig, then a second client and a second freelancer try to read, change and cancel that booking and its transaction.
  test("users cannot see or change bookings and transactions that are not theirs", async ({
    page,
    browser,
  }) => {
    await loginAs(page, "client");
    const created = await apiAs(page, "POST", "/bookings", {
      gigId: env("TEST_OWNED_GIG_ID"),
      requirements: "Three product descriptions for an online plant shop.",
    });
    expect(created.status()).toBe(201);
    const { booking, transaction } = (await created.json()).data;

    // Each outsider gets their own browser context (Playwright, 2026).
    const outsiders = [];
    for (const role of ["otherclient", "otherfreelancer"]) {
      const context = await browser.newContext();
      const outsider = await context.newPage();
      await loginAs(outsider, role);
      outsiders.push({ context, outsider });
    }
    const [{ outsider: otherClient }, { outsider: otherFreelancer }] = outsiders;

    for (const outsider of [otherClient, otherFreelancer]) {
      expect((await apiAs(outsider, "GET", `/bookings/${booking._id}`)).status()).toBe(403);
      expect((await apiAs(outsider, "GET", `/transactions/${transaction._id}`)).status()).toBe(403);
      expect((await apiAs(outsider, "DELETE", `/bookings/${booking._id}`)).status()).toBe(403);
    }
    expect(
      (
        await apiAs(otherFreelancer, "PATCH", `/bookings/${booking._id}/status`, {
          status: "in_progress",
        })
      ).status()
    ).toBe(403);

    // The other client's bookings page does not list it
    await otherClient.goto("/bookings");
    await expect(otherClient.getByRole("heading", { name: "Your bookings" })).toBeVisible();
    await expect(otherClient.getByText(transaction.reference)).toHaveCount(0);

    // The booking is still confirmed for its owner
    const owned = await apiAs(page, "GET", `/bookings/${booking._id}`);
    expect(owned.status()).toBe(200);
    const ownedData = (await owned.json()).data;
    expect(ownedData.booking.status).toBe("confirmed");
    expect(ownedData.transaction.status).toBe("completed");

    for (const { context } of outsiders) await context.close();
  });

  // Opens a gig whose description holds script and image tags and checks they show as text and never run.
  test("markup stored in a gig is shown as text and never runs", async ({ page }) => {
    let dialogOpened = false;
    page.on("dialog", async (dialog) => {
      dialogOpened = true;
      await dialog.dismiss();
    });

    await loginAs(page, "client");
    await page.goto(`/gigs/${env("TEST_MARKUP_GIG_ID")}`);
    await expect(page.getByRole("heading", { name: /Stored markup check/ })).toBeVisible();

    // React escapes the text (OWASP Foundation, 2026b).
    await expect(
      page.getByText('<img src=x onerror="window.__xss = true">', { exact: false })
    ).toBeVisible();
    await expect(page.locator("img[onerror]")).toHaveCount(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(dialogOpened).toBe(false);
  });

  // Checks the security headers on the React app and that the main pages load with no CSP violations.
  test("the React app is served with a strict Content Security Policy and no violations", async ({
    page,
  }) => {
    const violations = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });

    const response = await page.goto("/");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'none'");
    expect(headers["content-security-policy"]).toContain("script-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // The pages load without breaking the policy (MDN Web Docs, 2026).
    await page.goto("/login");
    await loginAs(page, "client");
    await page.goto("/explore");
    await expect(page.getByLabel("Search gigs")).toBeVisible();
    expect(violations).toEqual([]);
  });
});

// Reference List:
// MDN Web Docs, 2026. Content Security Policy (CSP). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP> [Accessed 08 October 2026].
// OWASP Foundation, 2026a. Authorization Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html> [Accessed 08 October 2026].
// OWASP Foundation, 2026b. Cross Site Scripting Prevention Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html> [Accessed 08 October 2026].
// Playwright, 2026. Isolation. [online] Available at: <https://playwright.dev/docs/browser-contexts> [Accessed 7 November 2026].
