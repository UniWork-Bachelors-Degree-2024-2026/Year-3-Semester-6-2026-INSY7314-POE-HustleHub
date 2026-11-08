// Routes for querying simulated transactions on HustleHub+
const express = require("express");

// Import transaction controller handlers
const {
  getUserTransactions,
  getTransactionById,
  getIncomeSummary,
  getTaxEstimate,
} = require("../controllers/transactionController.js");

// Import authentication and role-checking middleware
const { validateAuth, validateRole } = require("../middleware/authMiddleware.js");

// Import validation middleware
const { validateObjectId } = require("../middleware/validationMiddleware.js");

const router = express.Router();

// Protected route: Income summary for freelancers
// Placed before /:id to prevent routing conflict
router.get("/income-summary", validateAuth, validateRole("freelancer", "admin"), getIncomeSummary);

// Protected route: Tax estimate and insights for the logged-in freelancer
// Also placed before /:id, and admins are excluded because tax belongs to one individual
router.get("/tax-estimate", validateAuth, validateRole("freelancer"), getTaxEstimate);

// Protected route: Get all transactions for the logged-in user
router.get("/", validateAuth, getUserTransactions);

// Protected route: View details of a single transaction
router.get("/:id", validateAuth, validateObjectId("id"), getTransactionById);

module.exports = router;
