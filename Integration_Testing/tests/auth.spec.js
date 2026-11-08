// Login, logout and route protection.
const { test, expect } = require("@playwright/test");
const { accounts, fillLogin, loginAs, readSession } = require("./helpers.js");
const { expiredTokenFor, disconnect } = require("./db.js");

test.afterAll(disconnect);

// Swaps the saved token, then opens the dashboard so the app has to call the API with it.
// The app may send the user to /login before this navigation finishes, or even before it starts,
// so an interrupted navigation is expected here and the tests check the final page instead (Playwright, 2026).
const openDashboardWithToken = async (page, token) => {
  await page.evaluate((value) => sessionStorage.setItem("hh_token", value), token);
  await page.goto("/dashboard").catch((error) => {
    if (!/interrupted by another navigation|ERR_ABORTED/.test(error.message)) throw error;
  });
};

test.describe("Authentication", () => {
  // Opens each protected page without logging in and checks the browser ends up on the login page.
  test("anonymous visitors are sent to the login page from protected pages", async ({ page }) => {
    for (const path of ["/dashboard", "/my-gigs", "/bookings", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  // Logs in with a wrong password and checks the generic error is shown and no token is saved.
  test("a wrong password shows the generic message and stores no session", async ({ page }) => {
    const { email } = accounts.client();
    const response = page.waitForResponse((res) => res.url().endsWith("/api/auth/login"));
    await fillLogin(page, { email, password: "WrongPassword1!" });

    expect((await response).status()).toBe(400);
    // Same message for a wrong email or password (OWASP Foundation, 2026).
    await expect(page.getByRole("alert")).toHaveText("Invalid credentials.");
    await expect(page).toHaveURL(/\/login$/);
    expect((await readSession(page)).token).toBeNull();
  });

  // Logs a freelancer in, checks the token and role in sessionStorage, then logs out and checks the dashboard is closed again.
  test("a freelancer logs in, gets a session for this tab only, and logs out", async ({ page }) => {
    await loginAs(page, "freelancer");
    await expect(page.getByText("Test Freelancer").first()).toBeVisible();

    const session = await readSession(page);
    expect(session.token.split(".")).toHaveLength(3);
    expect(JSON.parse(session.user).role).toBe("freelancer");
    expect(session.localKeys).not.toContain("hh_token");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await readSession(page)).token).toBeNull();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  // Enters five wrong passwords, then checks the right password is refused with the lockout message.
  test("the account locks after five wrong passwords, even for the right one", async ({ page }) => {
    const account = accounts.lockuser();
    for (let attempt = 1; attempt <= 5; attempt++) {
      await fillLogin(page, { email: account.email, password: `WrongPassword${attempt}!` });
      await expect(page.getByRole("alert")).toBeVisible();
    }
    await fillLogin(page, account);
    await expect(page.getByRole("alert")).toContainText("Too many failed login attempts");
    await expect(page).toHaveURL(/\/login$/);
  });

  // Changes the role inside the client's token to admin without re-signing it, and checks the app clears the session and returns to the login page.
  test("a token edited in the browser is refused and the user is logged out", async ({ page }) => {
    await loginAs(page, "client");
    const { token } = await readSession(page);
    const [header, payload, signature] = token.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    const forged = Buffer.from(JSON.stringify({ ...claims, role: "admin" })).toString("base64url");

    // The signature no longer matches the payload (Auth0, 2026).
    const refused = page.waitForResponse(
      (res) => res.url().includes("/api/") && res.status() === 401
    );
    await openDashboardWithToken(page, `${header}.${forged}.${signature}`);
    await refused;

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    const session = await readSession(page);
    expect(session.token).toBeNull();
    expect(session.user).toBeNull();
  });

  // Gives the browser a correctly signed token that has expired, and checks the app logs the user out instead of showing a broken page.
  test("an expired token logs the user out cleanly", async ({ page }) => {
    await loginAs(page, "freelancer");
    const expired = await expiredTokenFor(accounts.freelancer().email);

    const refused = page.waitForResponse(
      (res) => res.url().includes("/api/") && res.status() === 401
    );
    await openDashboardWithToken(page, expired);
    await refused;

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    expect((await readSession(page)).token).toBeNull();
  });
});

// Reference List:
// Auth0, 2026. JSON Web Token Introduction. [online] Available at: <https://www.jwt.io/introduction> [Accessed 7 November 2026].
// OWASP Foundation, 2026. Authentication Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> [Accessed 01 August 2026].
// Playwright, 2026. Navigations. [online] Available at: <https://playwright.dev/docs/navigations> [Accessed 7 November 2026].
