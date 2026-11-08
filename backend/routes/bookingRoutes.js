// Routes for managing bookings on HustleHub+
const express = require("express");

// Import booking controller handlers
const {
  createBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
} = require("../controllers/bookingController.js");

// Import authentication and role-checking middleware
const { validateAuth, validateRole } = require("../middleware/authMiddleware.js");

// Import the limiter used on booking creation
const { bookingLimiter } = require("../middleware/rateLimitMiddleware.js");

// Import validation middleware
const {
  validateObjectId,
  validateBookingInput,
  validateBookingStatusUpdate,
} = require("../middleware/validationMiddleware.js");

const router = express.Router();

// Protected route: Get all bookings for the logged-in user
// Clients see gigs they booked; Freelancers see incoming bookings
router.get("/", validateAuth, getUserBookings);

// Protected route: View details of a single booking
router.get("/:id", validateAuth, validateObjectId("id"), getBookingById);

// Protected route: Create a new booking (Clients and Admins only)
// Note: Freelancers cannot book gigs (enforced here and in controller)
router.post(
  "/",
  bookingLimiter,
  validateAuth,
  validateRole("client", "admin"),
  validateBookingInput,
  createBooking
);

// Protected route: Update booking status (e.g. in_progress, completed, cancelled)
router.patch(
  "/:id/status",
  validateAuth,
  validateObjectId("id"),
  validateBookingStatusUpdate,
  updateBookingStatus
);

// Protected route: Cancel a booking (Client owner or Admin)
router.delete("/:id", validateAuth, validateObjectId("id"), cancelBooking);

module.exports = router;
