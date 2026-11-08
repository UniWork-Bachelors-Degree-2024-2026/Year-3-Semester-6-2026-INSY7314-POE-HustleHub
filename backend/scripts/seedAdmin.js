// Creates the first admin account from environment variables, because the public API cannot assign the admin role.
// Run with: npm run seed:admin
require("dotenv").config();
const mongoose = require("mongoose");

const database = require("../middleware/dbMiddleware.js");
const User = require("../models/userModel.js");
const {
  validateEmailFormat,
  validatePasswordComplexity,
} = require("../middleware/validationMiddleware.js");

const seedAdmin = async () => {
  const username = (process.env.ADMIN_USERNAME || "").trim();
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  // Reuse the same rules as public registration so the admin password is never weaker
  const problems = [];
  if (username.length < 2 || username.length > 30) {
    problems.push("ADMIN_USERNAME must be between 2 and 30 characters.");
  }
  const emailError = validateEmailFormat(email);
  if (emailError) problems.push(`ADMIN_EMAIL: ${emailError}`);
  const passwordError = validatePasswordComplexity(password);
  if (passwordError) problems.push(`ADMIN_PASSWORD: ${passwordError}`);

  if (problems.length > 0) {
    console.error("Admin seed cancelled:\n - " + problems.join("\n - "));
    process.exitCode = 1;
    return;
  }

  // Connect using the shared database helper (rudderz243, 2026).
  await database.start();

  const existing = await User.findOne({ email });
  if (existing && existing.role === "admin") {
    console.log("An admin with that email already exists. Nothing was changed.");
    return;
  }
  if (existing) {
    console.error("That email belongs to a non-admin account. Choose a different ADMIN_EMAIL.");
    process.exitCode = 1;
    return;
  }

  // The password is hashed by the pre-save hook on the user model, never stored as typed
  await User.create({ username, email, password, role: "admin" });
  console.log(`Admin account created for ${email}.`);
};

seedAdmin()
  .catch((error) => {
    console.error("Admin seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
