const mongoose = require("mongoose");

const BOOKING_STATUS = Object.freeze([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

// Booking schema representing a service booked by a client from a freelancer
const bookingSchema = new mongoose.Schema(
  {
    // The client requesting/paying for the service
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A booking must have an associated client"],
      index: true,
    },
    // The gig service listing being booked
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: [true, "A booking must reference a valid gig"],
      index: true,
    },
    // The freelancer providing the service
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A booking must have an associated freelancer"],
      index: true,
    },
    // Agreed price of the service at time of booking
    price: {
      type: Number,
      required: [true, "Booking price is required"],
      min: [1, "Booking price must be at least 1.00 ZAR"],
    },
    // Status lifecycle of the booking
    status: {
      type: String,
      enum: {
        values: BOOKING_STATUS,
        message: "{VALUE} is not a valid booking status",
      },
      default: "pending",
      index: true,
    },
    // Date/time when the client scheduled or expects delivery
    scheduledDate: {
      type: Date,
      default: Date.now,
    },
    // Additional notes, project requirements, or instructions from the client
    requirements: {
      type: String,
      trim: true,
      maxlength: [2000, "Requirements cannot exceed 2000 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user-related bookings efficiently
bookingSchema.index({ client: 1, createdAt: -1 });
bookingSchema.index({ freelancer: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);
Booking.BOOKING_STATUS = BOOKING_STATUS;

module.exports = Booking;
module.exports.BOOKING_STATUS = BOOKING_STATUS;
