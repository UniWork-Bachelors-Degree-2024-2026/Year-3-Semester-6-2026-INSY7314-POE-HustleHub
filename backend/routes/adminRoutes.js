// Routes only an admin can use
const express = require("express");

const { getAuditEvents } = require("../controllers/auditController.js");
const { validateAuth, validateRole } = require("../middleware/authMiddleware.js");

const router = express.Router();

// Protected route: review the stored security events (Admins only)
router.get("/audit-events", validateAuth, validateRole("admin"), getAuditEvents);

module.exports = router;
