// Routes for managing gig listings on the marketplace
const express = require("express");

// Import gig controller handler methods
const {
  createGig,
  getAllGigs,
  getMyGigs,
  getGigById,
  updateGig,
  deleteGig,
} = require("../controllers/gigController.js");

// Import authentication and role-checking middleware
const { validateAuth, validateRole } = require("../middleware/authMiddleware.js");

// Import input validation middleware
const {
  validateObjectId,
  validateGigInput,
  validateGigUpdate,
} = require("../middleware/validationMiddleware.js");

const router = express.Router();

// Public route: Browse all active gigs in the marketplace
router.get("/", getAllGigs);

// Protected route: Freelancers can view all of their own gigs
// (Placed before /:id so Express doesn't mistake 'my-gigs' for a gig ID)
router.get("/my-gigs", validateAuth, validateRole("freelancer", "admin"), getMyGigs);

// Public route: View details of a single gig by ID
router.get("/:id", validateObjectId("id"), getGigById);

// Protected route: Create a new gig (freelancers and admins only)
router.post("/", validateAuth, validateRole("freelancer", "admin"), validateGigInput, createGig);

// Protected route: Update a gig (only the owner freelancer or admin)
router.put(
  "/:id",
  validateAuth,
  validateObjectId("id"),
  validateRole("freelancer", "admin"),
  validateGigUpdate,
  updateGig
);

// Protected route: Delete a gig (only the owner freelancer or admin)
router.delete(
  "/:id",
  validateAuth,
  validateObjectId("id"),
  validateRole("freelancer", "admin"),
  deleteGig
);

module.exports = router;
