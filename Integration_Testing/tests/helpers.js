// Shared steps for the tests.
const { expect } = require("@playwright/test");

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} was not set by global-setup.js`);
  return value;
};

const accounts = {
  freelancer: () => ({ email: env("TEST_FREELANCER_EMAIL"), password: env("TEST_PASSWORD") }),
  client: () => ({ email: env("TEST_CLIENT_EMAIL"), password: env("TEST_PASSWORD") }),
  admin: () => ({ email: env("TEST_ADMIN_EMAIL"), password: env("TEST_PASSWORD") }),
  lockuser: () => ({ email: env("TEST_LOCK_EMAIL"), password: env("TEST_PASSWORD") }),
  resetuser: () => ({ email: env("TEST_RESET_EMAIL"), password: env("TEST_PASSWORD") }),
  twofactor: () => ({ email: env("TEST_TWOFACTOR_EMAIL"), password: env("TEST_PASSWORD") }),
  taxfreelancer: () => ({
    email: env("TEST_TAX_FREELANCER_EMAIL"),
    password: env("TEST_PASSWORD"),
  }),
  otherfreelancer: () => ({
    email: env("TEST_OTHER_FREELANCER_EMAIL"),
    password: env("TEST_PASSWORD"),
  }),
  otherclient: () => ({ email: env("TEST_OTHER_CLIENT_EMAIL"), password: env("TEST_PASSWORD") }),
};

// Elements are found by label and role (Playwright, 2026).
const fillLogin = async (page, { email, password }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
};

const loginAs = async (page, role) => {
  await fillLogin(page, accounts[role]());
  await expect(page).toHaveURL(/\/dashboard$/);
};

const readSession = (page) =>
  page.evaluate(() => ({
    token: sessionStorage.getItem("hh_token"),
    user: sessionStorage.getItem("hh_user"),
    localKeys: Object.keys(localStorage),
  }));

const typeCode = async (page, code, label = "Verification code") => {
  await page.getByLabel(`${label}, digit 1 of 6`).click();
  await page.keyboard.type(code);
};

// Calls the API with the logged in user's token, sending data as the JSON body when given
const apiAs = async (page, method, path, data) => {
  const { token } = await readSession(page);
  return page.request.fetch(`https://localhost:3000/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    ...(data === undefined ? {} : { data }),
  });
};

// Watches for API calls to a path, so a test can check that the browser never sent one
const recordRequests = (page, path, method = "POST") => {
  const sent = [];
  page.on("request", (request) => {
    if (request.url().endsWith(`/api${path}`) && request.method() === method) sent.push(request);
  });
  return sent;
};

module.exports = {
  env,
  accounts,
  fillLogin,
  loginAs,
  readSession,
  typeCode,
  apiAs,
  recordRequests,
};

// Reference List:
// Playwright, 2026. Locators. [online] Available at: <https://playwright.dev/docs/locators> [Accessed 7 November 2026].
