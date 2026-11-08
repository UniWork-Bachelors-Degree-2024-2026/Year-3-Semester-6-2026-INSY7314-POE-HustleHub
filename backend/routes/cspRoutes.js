// Route that receives browser Content Security Policy violation reports
const express = require("express");

const { receiveCspReport } = require("../controllers/cspReportController.js");
const { cspReportLimiter } = require("../middleware/rateLimitMiddleware.js");

const router = express.Router();

// Public route: browsers post reports here without a token, so only the limiter protects it
router.post("/", cspReportLimiter, receiveCspReport);

module.exports = router;
