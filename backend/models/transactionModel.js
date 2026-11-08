const mongoose = require("mongoose");

const TRANSACTION_STATUS = Object.freeze(["completed", "pending", "failed", "refunded"]);

// Transaction schema representing the simulated payment / transaction record
const transactionSchema = new mongoose.Schema(
  {
    // Associated booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "A transaction must be associated with a booking"],
      index: true,
    },
    // The client who made the payment
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction must record the client ID"],
      index: true,
    },
    // The freelancer receiving the payment
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Transaction must record the freelancer ID"],
      index: true,
    },
    // Monetary amount in ZAR
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
      min: [1, "Transaction amount must be at least 1.00 ZAR"],
    },
    // Transaction status
    status: {
      type: String,
      enum: {
        values: TRANSACTION_STATUS,
        message: "{VALUE} is not a valid transaction status",
      },
      default: "completed",
      index: true,
    },
    // Payment method simulation (e.g. 'simulated_card', 'simulated_eft')
    paymentMethod: {
      type: String,
      default: "simulated_card",
    },
    // Unique payment confirmation / reference number
    reference: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    // Timestamp of the transaction
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ clientId: 1, timestamp: -1 });
transactionSchema.index({ freelancerId: 1, timestamp: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
Transaction.TRANSACTION_STATUS = TRANSACTION_STATUS;

module.exports = Transaction;
module.exports.TRANSACTION_STATUS = TRANSACTION_STATUS;
