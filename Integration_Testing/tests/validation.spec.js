// Invalid input in the forms is caught in the browser and never reaches the API.
const { test, expect } = require("@playwright/test");
const { env, loginAs, recordRequests } = require("./helpers.js");

test.describe("Input validation", () => {
  // Fills the sign up form with a bad email, a weak password and a different confirmation, and checks each field shows its error and nothing is sent.
  test("the register form explains each mistake and sends nothing", async ({ page }) => {
    const sent = recordRequests(page, "/auth/register");
    await page.goto("/register");
    await page.locator("#reg-username").fill("Form Check");
    await page.locator("#reg-email").fill("not-an-email");
    await page.locator("#reg-password").fill("password");
    await page.locator("#reg-confirm").fill("password1");
    await page.getByRole("button", { name: "Send verification code" }).click();

    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
    await expect(
      page.getByText("Password does not meet the complexity requirements.")
    ).toBeVisible();
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
    // Checked in the browser first, the API checks again (OWASP Foundation, 2026).
    expect(sent).toHaveLength(0);
  });

  // Fills the gig editor with values outside the allowed ranges and checks the errors are listed and no gig is sent.
  test("the gig editor refuses out of range values and sends nothing", async ({ page }) => {
    await loginAs(page, "freelancer");
    const sent = recordRequests(page, "/gigs");
    await page.goto("/my-gigs/new");

    await page.locator("#ed-title").fill("Hi");
    await page.locator("#ed-desc").fill("Too short");
    await page.locator("#ed-price").fill("0");
    await page.locator("#ed-days").fill("95");
    await page.getByRole("button", { name: "Publish gig" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "4 fields need fixing before this gig can be saved."
    );
    await expect(page.getByText("Title must be 5 to 100 characters")).toBeVisible();
    await expect(page.getByText("Describe the gig in 20 to 2000 characters")).toBeVisible();
    await expect(page.getByText("Enter a price between R 1 and R 1 000 000")).toBeVisible();
    await expect(
      page.getByText("Delivery must be a whole number of days from 1 to 90.")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/my-gigs\/new$/);
    expect(sent).toHaveLength(0);
  });

  // Types markup and letters into the gig form and checks the blocked characters never appear in the fields.
  test("markup and letters cannot be typed into the gig form", async ({ page }) => {
    await loginAs(page, "freelancer");
    await page.goto("/my-gigs/new");

    await page.locator("#ed-title").pressSequentially("<script>Logo</script>");
    await expect(page.locator("#ed-title")).toHaveValue("scriptLogo/script");
    // The number fields only keep digits
    await page.locator("#ed-price").pressSequentially("-12a5");
    await expect(page.locator("#ed-price")).toHaveValue("125");
    await page.locator("#ed-days").pressSequentially("1e2");
    await expect(page.locator("#ed-days")).toHaveValue("12");
  });

  // Tries to book with a brief that is too short and checks the brief error is shown and no booking is sent.
  test("a booking with too short a brief is not sent", async ({ page }) => {
    await loginAs(page, "client");
    const sent = recordRequests(page, "/bookings");
    await page.goto(`/gigs/${env("TEST_OWNED_GIG_ID")}`);

    await page.getByLabel("Project brief").fill("Hello");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByText("Add a brief of 10 to 1000 characters")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review and pay" })).toHaveCount(0);
    expect(sent).toHaveLength(0);
  });
});

// Reference List:
// OWASP Foundation, 2026. Input Validation Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html> [Accessed 7 November 2026].
