// Creates the test accounts and gigs, and removes everything the run created afterwards.
// Values reach the tests through environment variables (Playwright, 2026).
const crypto = require("crypto");
const path = require("path");

const backendDir = path.join(__dirname, "..", "backend");
require(path.join(backendDir, "node_modules", "dotenv")).config({
  path: path.join(backendDir, ".env"),
  quiet: true,
});

const mongoose = require(path.join(backendDir, "node_modules", "mongoose"));
const User = require(path.join(backendDir, "models", "userModel.js"));
const Gig = require(path.join(backendDir, "models", "gigModel.js"));
const Booking = require(path.join(backendDir, "models", "bookingModel.js"));
const Transaction = require(path.join(backendDir, "models", "transactionModel.js"));
const Profile = require(path.join(backendDir, "models", "profileModel.js"));
const Otp = require(path.join(backendDir, "models", "otpModel.js"));

const runId = crypto.randomBytes(4).toString("hex");
// Random each run and meets the password rules
const password = `Hh7!${crypto.randomBytes(10).toString("hex")}`;
const emailFor = (name) => `it${runId}.${name}@hustlehub.test`;

const accounts = [
  { key: "freelancer", username: "Test Freelancer", role: "freelancer" },
  { key: "client", username: "Test Client", role: "client" },
  { key: "admin", username: "Test Admin", role: "admin" },
  // Each used by one test only
  { key: "lockuser", username: "Test Lock User", role: "client" },
  { key: "resetuser", username: "Test Reset User", role: "client" },
  { key: "twofactor", username: "Test Two Factor", role: "freelancer" },
  { key: "taxfreelancer", username: "Test Tax Freelancer", role: "freelancer" },
  // Try to reach resources owned by the main freelancer and client
  { key: "otherfreelancer", username: "Test Other Freelancer", role: "freelancer" },
  { key: "otherclient", username: "Test Other Client", role: "client" },
];
// Created by the tests through the register page
const registerKeys = ["newcomer", "wrongcode"];
const runEmails = [
  ...accounts.map((account) => emailFor(account.key)),
  ...registerKeys.map(emailFor),
];

// Saved straight to the database, skipping the API's sanitisation
const STORED_MARKUP =
  '<img src=x onerror="window.__xss = true"><script>window.__xss = true</script>';

const cleanup = async () => {
  const users = await User.find({ email: { $in: runEmails } }).select("_id");
  const ids = users.map((user) => user._id);
  await Transaction.deleteMany({
    $or: [{ clientId: { $in: ids } }, { freelancerId: { $in: ids } }],
  });
  await Booking.deleteMany({ $or: [{ client: { $in: ids } }, { freelancer: { $in: ids } }] });
  await Gig.deleteMany({ freelancer: { $in: ids } });
  await Profile.deleteMany({ user: { $in: ids } });
  await Otp.deleteMany({ email: { $in: runEmails } });
  await User.deleteMany({ _id: { $in: ids } });
};

module.exports = async () => {
  if (!process.env.CONN_STRING || !process.env.JWT_SECRET) {
    throw new Error(
      "CONN_STRING and JWT_SECRET must be set, either in backend/.env or in the environment."
    );
  }
  await mongoose.connect(process.env.CONN_STRING);

  try {
    const created = {};
    for (const account of accounts) {
      created[account.key] = await User.create({
        username: account.username,
        email: emailFor(account.key),
        password,
        role: account.role,
      });
    }

    const markupGig = await Gig.create({
      title: `Stored markup check ${runId}`,
      description: `Logo design for small shops. ${STORED_MARKUP}`,
      category: "Graphic & Design",
      price: 750,
      deliveryTimeDays: 3,
      freelancer: created.freelancer._id,
      status: "active",
    });

    const secondGig = await Gig.create({
      title: `Business plan review ${runId}`,
      description: "A review of a one page business plan with written feedback within two days.",
      category: "Business",
      price: 400,
      deliveryTimeDays: 2,
      freelancer: created.freelancer._id,
      status: "active",
    });

    const ownedGig = await Gig.create({
      title: `Ownership check ${runId}`,
      description: "A short copywriting job used to check that only its owner can change it.",
      category: "Writing & Translation",
      price: 900,
      deliveryTimeDays: 3,
      freelancer: created.freelancer._id,
      status: "active",
    });

    // Priced into the second SARS bracket so the dashboard shows a tax amount above zero
    const taxGig = await Gig.create({
      title: `Annual retainer ${runId}`,
      description: "A year of monthly bookkeeping and reporting for a small business.",
      category: "Business",
      price: 300000,
      deliveryTimeDays: 30,
      freelancer: created.taxfreelancer._id,
      status: "active",
    });

    process.env.TEST_RUN_ID = runId;
    process.env.TEST_PASSWORD = password;
    process.env.TEST_FREELANCER_EMAIL = emailFor("freelancer");
    process.env.TEST_CLIENT_EMAIL = emailFor("client");
    process.env.TEST_ADMIN_EMAIL = emailFor("admin");
    process.env.TEST_LOCK_EMAIL = emailFor("lockuser");
    process.env.TEST_RESET_EMAIL = emailFor("resetuser");
    process.env.TEST_TWOFACTOR_EMAIL = emailFor("twofactor");
    process.env.TEST_NEWCOMER_EMAIL = emailFor("newcomer");
    process.env.TEST_WRONGCODE_EMAIL = emailFor("wrongcode");
    process.env.TEST_SECOND_GIG_ID = String(secondGig._id);
    process.env.TEST_MARKUP_GIG_ID = String(markupGig._id);
    process.env.TEST_TAX_FREELANCER_EMAIL = emailFor("taxfreelancer");
    process.env.TEST_OTHER_FREELANCER_EMAIL = emailFor("otherfreelancer");
    process.env.TEST_OTHER_CLIENT_EMAIL = emailFor("otherclient");
    process.env.TEST_OWNED_GIG_ID = String(ownedGig._id);
    process.env.TEST_TAX_GIG_ID = String(taxGig._id);
  } catch (error) {
    await cleanup().catch(() => {});
    await mongoose.disconnect();
    throw error;
  }

  // Runs after all tests, even if some failed
  return async () => {
    try {
      await cleanup();
    } finally {
      await mongoose.disconnect();
    }
  };
};

// Reference List:
// Playwright, 2026. Global setup and teardown. [online] Available at: <https://playwright.dev/docs/test-global-setup-teardown> [Accessed 7 November 2026].
