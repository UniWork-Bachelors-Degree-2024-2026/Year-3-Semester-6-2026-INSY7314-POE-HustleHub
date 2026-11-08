// Call in required modules
const mongoose = require("mongoose");
// Calls in the .env file we created (for the connectionString later)
require("dotenv").config();
const logger = require("../utils/logger.js");

// Log connection issues that happen after the initial connect succeeds,
// for example, a network blip or the Atlas cluster restarting mid-session, so
// they are visible instead of failing silently (rudderz243, 2026).
mongoose.connection.on("error", (error) => {
  logger.error(
    "MongoDB connection error after initial connect: " + (error.message || error),
    "DATABASE",
    error
  );
});

mongoose.connection.on("disconnected", () => {
  logger.warn(
    "MongoDB disconnected. Requests relying on the database will fail until it reconnects.",
    "DATABASE"
  );
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected.", "DATABASE");
});

// Create a function to init database connection (rudderz243, 2026).
const database = {
  start: async () => {
    try {
      // Get the connectionString
      const connString = process.env.CONN_STRING;
      logger.info("Starting database connection attempt...", "DATABASE");
      // Wait for the connection to succeed
      await mongoose.connect(connString);
      logger.info("The Database connected successfully.", "DATABASE");
    } catch (error) {
      logger.error(
        "An error occurred connecting to database: " + (error.message || error),
        "DATABASE",
        error
      );
      // If we cant use db then no point in continuing so we exit
      process.exit(1);
    }
  },
};

module.exports = database;

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
