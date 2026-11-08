// Registration, password reset and two-factor login (Playwright, 2026).
const { test, expect } = require("@playwright/test");
const { env, accounts, fillLogin, loginAs, readSession, typeCode } = require("./helpers.js");
const { setKnownCode, wrongCodeFor, findUser, resetTwoFactor, disconnect } = require("./db.js");

test.afterAll(disconnect);

const startRegistration = async (page, { username, email, password, role }) => {
  await page.goto("/register");
  await page.getByRole("button", { name: role }).click();
  await page.locator("#reg-username").fill(username);
  await page.locator("#reg-email").fill(email);
  await page.locator("#reg-password").fill(password);
  await page.locator("#reg-confirm").fill(password);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
};

test.describe("Account flows", () => {
  // Starts a client sign up, enters the wrong code, and checks that an error is shown, no session is stored and no user is saved.
  test("a wrong registration code is refused and no account is created", async ({ page }) => {
    const email = env("TEST_WRONGCODE_EMAIL");
    await startRegistration(page, {
      username: "Wrong Code User",
      email,
      password: env("TEST_PASSWORD"),
      role: /Hire talent/,
    });

    const code = await setKnownCode(email, "register");
    await typeCode(page, wrongCodeFor(code));
    await page.getByRole("button", { name: "Confirm and create account" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
    expect((await readSession(page)).token).toBeNull();
    // No account until the right code is confirmed (MDN Web Docs, 2026).
    expect(await findUser(email)).toBeNull();
  });

  // Signs up a freelancer with the right code, checks the dashboard opens with freelancer links, and that the password is saved hashed.
  test("a new freelancer registers with the emailed code and lands on the dashboard", async ({
    page,
  }) => {
    const email = env("TEST_NEWCOMER_EMAIL");
    await startRegistration(page, {
      username: "New Freelancer",
      email,
      password: env("TEST_PASSWORD"),
      role: /Sell my skills/,
    });

    const code = await setKnownCode(email, "register");
    await typeCode(page, code);
    await page.getByRole("button", { name: "Confirm and create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    expect(JSON.parse((await readSession(page)).user).role).toBe("freelancer");
    await expect(page.getByRole("link", { name: "My gigs", exact: true })).toBeVisible();

    // Stored as a bcrypt hash (OWASP Foundation, 2026a).
    const saved = await findUser(email);
    expect(saved.password).not.toBe(env("TEST_PASSWORD"));
    expect(saved.password).toMatch(/^\$2[aby]\$/);
  });

  // Resets a password with the emailed code, then checks the old password is refused and the new one logs in.
  test("a forgotten password is reset with the emailed code, and only the new one works", async ({
    page,
  }) => {
    const { email, password: oldPassword } = accounts.resetuser();
    const newPassword = `${oldPassword}Nw`;

    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await page.locator("#forgot-email").fill(email);
    await page.getByRole("button", { name: "Send reset code" }).click();
    await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();

    const code = await setKnownCode(email, "reset");
    await typeCode(page, code, "Reset code");
    await page.locator("#reset-password").fill(newPassword);
    await page.locator("#reset-confirm").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();

    // The old password no longer works (OWASP Foundation, 2026b).
    await fillLogin(page, { email, password: oldPassword });
    await expect(page.getByRole("alert")).toHaveText("Invalid credentials.");

    await fillLogin(page, { email, password: newPassword });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  // Turns on two-factor login from the profile page, then checks a login needs the emailed code and a wrong code is refused.
  test("with two-factor login on, the password alone does not log in", async ({ page }) => {
    const account = accounts.twofactor();
    await resetTwoFactor(account.email);

    await loginAs(page, "twofactor");
    await page.goto("/profile");
    await page.getByRole("tab", { name: "Account" }).click();
    await page.locator("#pf-2fa-pass").fill(account.password);
    await page.getByRole("button", { name: "Turn on two-factor login" }).click();
    await expect(page.getByText("Two-factor login is on.")).toBeVisible();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "Log out" })
      .click();
    await expect(page).toHaveURL(/\/login$/);

    // No token until the code is confirmed
    await fillLogin(page, account);
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    expect((await readSession(page)).token).toBeNull();

    const code = await setKnownCode(account.email, "login");
    await typeCode(page, wrongCodeFor(code));
    await page.getByRole("button", { name: "Confirm and log in" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    expect((await readSession(page)).token).toBeNull();

    await typeCode(page, code);
    await page.getByRole("button", { name: "Confirm and log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect((await readSession(page)).token).not.toBeNull();
  });
});

// Reference List:
// MDN Web Docs, 2026. One-time passwords (OTP). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/OTP> [Accessed 10 October 2026].
// OWASP Foundation, 2026a. Authentication Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html> [Accessed 01 August 2026].
// OWASP Foundation, 2026b. Forgot Password Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html> [Accessed 10 October 2026].
// Playwright, 2026. Writing tests. [online] Available at: <https://playwright.dev/docs/writing-tests> [Accessed 7 November 2026].
