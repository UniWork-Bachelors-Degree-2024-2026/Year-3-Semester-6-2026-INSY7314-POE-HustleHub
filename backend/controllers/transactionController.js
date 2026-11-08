// Controller handling transaction records and income queries
const Transaction = require("../models/transactionModel.js");
const logger = require("../utils/logger.js");
const { buildTaxEstimate, taxYearBounds, taxYearStartYear } = require("../utils/tax.js");

/**
 * Gets all transactions associated with the authenticated user
 * ROUTE: GET /api/transactions
 * ACCESS: Private
 */
const getUserTransactions = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "client") {
      filter = { clientId: req.user._id };
    } else if (req.user.role === "freelancer") {
      filter = { freelancerId: req.user._id };
    } else if (req.user.role === "admin") {
      filter = {};
    }

    const transactions = await Transaction.find(filter)
      .populate("bookingId", "status scheduledDate gig")
      .populate("clientId", "username email")
      .populate("freelancerId", "username email")
      .sort({ timestamp: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    logger.error(`Get user transactions error: ${error.message}`, "TRANSACTIONS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving transactions.",
    });
  }
};

/**
 * Gets a specific transaction by ID with ownership enforcement
 * ROUTE: GET /api/transactions/:id
 * ACCESS: Private
 */
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("bookingId")
      .populate("clientId", "username email")
      .populate("freelancerId", "username email");

    if (!transaction) {
      logger.warn(`Transaction not found: ID ${req.params.id}`, "TRANSACTIONS");
      return res.status(404).json({
        success: false,
        message: "Transaction not found.",
      });
    }

    // Ownership check: must be client, freelancer, or admin
    const isClient = transaction.clientId._id.toString() === req.user._id.toString();
    const isFreelancer = transaction.freelancerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin) {
      logger.warn(
        `Unauthorized transaction view attempt on ID ${req.params.id} by user "${req.user.username}" (${req.user.role})`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this transaction.",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    logger.error(`Get transaction by ID error: ${error.message}`, "TRANSACTIONS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving the transaction.",
    });
  }
};

/**
 * Gets income summary for freelancer (total earnings, count, list of earnings)
 * ROUTE: GET /api/transactions/income-summary
 * ACCESS: Private (Freelancers & Admins only)
 */
const getIncomeSummary = async (req, res) => {
  try {
    // Freelancers see their own income, admins see income across the platform
    const filter = { status: "completed" };
    if (req.user.role !== "admin") {
      filter.freelancerId = req.user._id;
    }

    const transactions = await Transaction.find(filter).sort({ timestamp: -1 });

    const totalIncome = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    logger.info(
      `Income summary calculated for ${
        req.user.role === "admin" ? "platform admin" : `freelancer "${req.user.username}"`
      }: R${totalIncome.toFixed(2)} across ${transactions.length} completed transactions`,
      "TRANSACTIONS"
    );

    return res.status(200).json({
      success: true,
      data: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalTransactions: transactions.length,
        currency: "ZAR",
        transactions,
      },
    });
  } catch (error) {
    logger.error(`Get income summary error: ${error.message}`, "TRANSACTIONS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving income summary.",
    });
  }
};

/**
 * Estimates the freelancer's income tax for the current tax year, with plain language insights
 * ROUTE: GET /api/transactions/tax-estimate
 * ACCESS: Private (Freelancers only, tax is worked out per individual)
 */
const getTaxEstimate = async (req, res) => {
  try {
    const now = new Date();
    const bounds = taxYearBounds(taxYearStartYear(now));

    // Only completed payments inside this tax year count, refunded and older payments do not
    const transactions = await Transaction.find({
      freelancerId: req.user._id,
      status: "completed",
      timestamp: { $gte: bounds.start, $lt: bounds.end },
    });
    const income = transactions.reduce((total, transaction) => total + transaction.amount, 0);

    const estimate = buildTaxEstimate({ income, paymentCount: transactions.length, now });

    logger.info(
      `Tax estimate calculated for freelancer ID ${req.user._id}: income R${estimate.income.toFixed(2)}, ` +
        `estimated tax R${estimate.tax.toFixed(2)} (${estimate.taxYear.label})`,
      "TRANSACTIONS"
    );

    return res.status(200).json({ success: true, data: estimate });
  } catch (error) {
    logger.error(`Get tax estimate error: ${error.message}`, "TRANSACTIONS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while estimating tax.",
    });
  }
};

module.exports = {
  getUserTransactions,
  getTransactionById,
  getIncomeSummary,
  getTaxEstimate,
};
