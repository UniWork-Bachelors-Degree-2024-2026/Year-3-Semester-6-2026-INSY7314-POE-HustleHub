// Routes for member profiles on HustleHub+
const express = require("express");

const { getPublicProfile, saveMyProfile } = require("../controllers/profileController.js");
const { validateAuth } = require("../middleware/authMiddleware.js");
const { validateObjectId } = require("../middleware/validationMiddleware.js");
const { validateProfileUpdate } = require("../middleware/profileValidationMiddleware.js");
const { accountLimiter } = require("../middleware/rateLimitMiddleware.js");

const router = express.Router();

// Protected route: save the details the logged in member wants to share
router.put("/me/profile", accountLimiter, validateAuth, validateProfileUpdate, saveMyProfile);

// Protected route: view what another member has chosen to share
router.get("/:id/profile", validateAuth, validateObjectId("id"), getPublicProfile);

module.exports = router;
