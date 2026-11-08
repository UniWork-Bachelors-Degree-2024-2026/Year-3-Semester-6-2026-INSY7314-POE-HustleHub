// Controller handling booking operations and simulated transaction creation
const crypto = require("crypto");
const Booking = require("../models/bookingModel.js");
const Gig = require("../models/gigModel.js");
const Transaction = require("../models/transactionModel.js");
const logger = require("../utils/logger.js");

// Each status lists the statuses it is allowed to move to, completed and cancelled are final.
const STATUS_TRANSITIONS = Object.freeze({
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
});

// A client may cancel only while work has not started.
const CLIENT_CANCELLABLE = Object.freeze(["pending", "confirmed"]);

// Saves the new booking status and refunds the transaction when the booking is cancelled.
const applyStatusChange = async (booking, status) => {
  booking.status = status;
  await booking.save();

  if (status === "cancelled") {
    await Transaction.updateOne(
      { bookingId: booking._id, status: "completed" },
      { status: "refunded" }
    );
  }
};

/**
 * Creates a new booking and automatically simulates payment & transaction creation
 * ROUTE: POST /api/bookings
 * ACCESS: Clients & Admins only
 */
const createBooking = async (req, res) => {
  try {
    const { gigId, scheduledDate, requirements, paymentMethod } = req.body;

    // 1. Check if gig exists
    // CodeQL recommends $eq for values that come from a request, so they are only ever compared as plain values (CodeQL, 2026d).
    const gig = await Gig.findOne({ _id: { $eq: gigId } });
    if (!gig) {
      logger.warn(`Booking creation failed: Gig not found for ID ${gigId}`, "BOOKINGS");
      return res.status(404).json({
        success: false,
        message: "The gig you are trying to book does not exist.",
      });
    }

    // Gig must be active to be booked
    if (gig.status !== "active") {
      logger.warn(
        `Booking creation rejected: Gig ${gigId} is not active (status: ${gig.status})`,
        "BOOKINGS"
      );
      return res.status(400).json({
        success: false,
        message: "This gig is currently not active and cannot be booked.",
      });
    }

    // RBAC Business Rule: Freelancers cannot book their own gigs
    if (gig.freelancer.toString() === req.user._id.toString()) {
      logger.warn(
        `Booking creation rejected: User ${req.user._id} attempted to book their own gig ${gigId}`,
        "BOOKINGS"
      );
      return res.status(400).json({
        success: false,
        message: "You cannot book your own gig listing.",
      });
    }

    // 2. Create the Booking record
    const booking = await Booking.create({
      client: req.user._id,
      gig: gig._id,
      freelancer: gig.freelancer,
      price: gig.price,
      status: "confirmed", // Simulated instant confirmation
      scheduledDate: scheduledDate ? new Date(scheduledDate) : Date.now(),
      requirements: requirements || "",
    });

    // 3. Generate a simulated transaction record
    const reference = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const transaction = await Transaction.create({
      bookingId: booking._id,
      clientId: req.user._id,
      freelancerId: gig.freelancer,
      amount: gig.price,
      status: "completed",
      paymentMethod: paymentMethod || "simulated_card",
      reference,
      timestamp: new Date(),
    });

    logger.info(
      `Booking created successfully: ID ${booking._id} by client "${req.user.username}" (${req.user._id}) for gig "${gig.title}" (Freelancer: ${gig.freelancer}). Scheduled: ${booking.scheduledDate.toISOString()}`,
      "BOOKINGS"
    );

    logger.info(
      `Simulated transaction completed: Ref ${transaction.reference} for booking ${booking._id} (Amount: R${transaction.amount}, Method: ${transaction.paymentMethod})`,
      "TRANSACTIONS"
    );

    // 4. Return populated booking & transaction data
    const populatedBooking = await Booking.findById(booking._id)
      .populate("gig", "title price category deliveryTimeDays")
      .populate("client", "username email")
      .populate("freelancer", "username email");

    return res.status(201).json({
      success: true,
      message: "Booking created and payment confirmed successfully.",
      data: {
        booking: populatedBooking,
        transaction,
      },
    });
  } catch (error) {
    logger.error(`Create booking error: ${error.message}`, "BOOKINGS", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        errors: messages,
      });
    }
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while creating the booking.",
    });
  }
};

/**
 * Gets bookings for the authenticated user (client sees bookings they made, freelancer sees bookings received)
 * ROUTE: GET /api/bookings
 * ACCESS: Private
 */
const getUserBookings = async (req, res) => {
  try {
    let filter = {};

    // Clients see gigs they booked; Freelancers see bookings for their gigs; Admins see all
    if (req.user.role === "client") {
      filter = { client: req.user._id };
    } else if (req.user.role === "freelancer") {
      filter = { freelancer: req.user._id };
    } else if (req.user.role === "admin") {
      filter = {};
    }

    const bookings = await Booking.find(filter)
      .populate("gig", "title price category deliveryTimeDays")
      .populate("client", "username email")
      .populate("freelancer", "username email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    logger.error(`Get user bookings error: ${error.message}`, "BOOKINGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving bookings.",
    });
  }
};

/**
 * Gets a single booking by ID with ownership enforcement
 * ROUTE: GET /api/bookings/:id
 * ACCESS: Private
 */
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("gig", "title price category deliveryTimeDays description")
      .populate("client", "username email")
      .populate("freelancer", "username email");

    if (!booking) {
      logger.warn(`Booking fetch failed: ID ${req.params.id} not found`, "BOOKINGS");
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // Ownership check: must be either the client, the freelancer, or an admin
    const isClient = booking.client._id.toString() === req.user._id.toString();
    const isFreelancer = booking.freelancer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin) {
      logger.warn(
        `Unauthorized booking view attempt on ${req.params.id} by user "${req.user.username}" (${req.user.role}, ID: ${req.user._id})`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to view this booking.",
      });
    }

    // Also fetch associated transaction if exists
    const transaction = await Transaction.findOne({ bookingId: booking._id });

    return res.status(200).json({
      success: true,
      data: {
        booking,
        transaction,
      },
    });
  } catch (error) {
    logger.error(`Get booking by ID error: ${error.message}`, "BOOKINGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving the booking.",
    });
  }
};

/**
 * Updates a booking's status along the allowed lifecycle only
 * ROUTE: PATCH /api/bookings/:id/status
 * ACCESS: Private (Freelancer, Client, or Admin depending on status change)
 */
const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      logger.warn(`Booking status update failed: ID ${req.params.id} not found`, "BOOKINGS");
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const userId = req.user._id.toString();
    const isClient = booking.client.toString() === userId;
    const isFreelancer = booking.freelancer.toString() === userId;
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isFreelancer && !isAdmin) {
      logger.warn(
        `Unauthorized booking status update attempt on ${req.params.id} by user "${req.user.username}" (${req.user.role})`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to update this booking.",
      });
    }

    const { status } = req.body;

    // A client who is not an admin can only cancel
    if (isClient && !isFreelancer && !isAdmin && status !== "cancelled") {
      logger.warn(
        `Illegal status change attempt: Client "${req.user.username}" attempted status "${status}" on booking ${booking._id}`,
        "BOOKINGS"
      );
      return res.status(403).json({
        success: false,
        message: "Clients are only permitted to cancel a booking.",
      });
    }

    // The new status must be a legal step from the current one
    const allowedNext = STATUS_TRANSITIONS[booking.status] || [];
    if (!allowedNext.includes(status)) {
      logger.warn(
        `Invalid booking status transition rejected: ${booking.status} -> ${status} for booking ${booking._id}`,
        "BOOKINGS"
      );
      return res.status(409).json({
        success: false,
        message: `A ${booking.status} booking cannot be changed to ${status}.`,
      });
    }

    // Once work has started only the freelancer or an admin can cancel
    if (status === "cancelled" && booking.status === "in_progress" && !isFreelancer && !isAdmin) {
      logger.warn(
        `Illegal cancellation attempt: Client "${req.user.username}" attempted to cancel in-progress booking ${booking._id}`,
        "BOOKINGS"
      );
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: A booking that is in progress can only be cancelled by the freelancer or an admin.",
      });
    }

    const previousStatus = booking.status;
    await applyStatusChange(booking, status);

    logger.info(
      `Booking ${booking._id} status transitioned from ${previousStatus} to ${status} by user "${req.user.username}" (${req.user.role})`,
      "BOOKINGS"
    );

    if (status === "cancelled") {
      logger.info(
        `Booking ${booking._id} cancelled; associated transaction marked as refunded`,
        "TRANSACTIONS"
      );
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("gig", "title price category")
      .populate("client", "username email")
      .populate("freelancer", "username email");

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully.",
      data: populatedBooking,
    });
  } catch (error) {
    logger.error(`Update booking status error: ${error.message}`, "BOOKINGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while updating booking status.",
    });
  }
};

/**
 * Cancels a booking and refunds its transaction (client owner before work starts, or admin)
 * ROUTE: DELETE /api/bookings/:id
 * ACCESS: Private
 */
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      logger.warn(`Booking cancellation failed: ID ${req.params.id} not found`, "BOOKINGS");
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const isClient = booking.client.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isClient && !isAdmin) {
      logger.warn(
        `Unauthorized booking cancellation attempt on ${req.params.id} by user "${req.user.username}"`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only the client who created this booking or an admin can cancel it.",
      });
    }

    // Clients can cancel pending or confirmed bookings, admins can cancel any booking that is not final
    const canCancel = isAdmin
      ? STATUS_TRANSITIONS[booking.status].includes("cancelled")
      : CLIENT_CANCELLABLE.includes(booking.status);

    if (!canCancel) {
      logger.warn(
        `Illegal booking cancellation attempted for status "${booking.status}" on booking ${booking._id}`,
        "BOOKINGS"
      );
      return res.status(409).json({
        success: false,
        message: `A ${booking.status} booking cannot be cancelled.`,
      });
    }

    await applyStatusChange(booking, "cancelled");

    logger.info(
      `Booking ${booking._id} cancelled by user "${req.user.username}". Associated transaction marked refunded.`,
      "BOOKINGS"
    );

    logger.info(`Transaction for booking ${booking._id} marked refunded`, "TRANSACTIONS");

    return res.status(200).json({
      success: true,
      message: "Booking cancelled and payment refunded.",
    });
  } catch (error) {
    logger.error(`Cancel booking error: ${error.message}`, "BOOKINGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while cancelling the booking.",
    });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
};

// Reference List:
// CodeQL, 2026d. Database query built from user-controlled sources. [online] Available at: <https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/> [Accessed 7 November 2026].
