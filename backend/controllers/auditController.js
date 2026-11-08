// Controller that lets an admin review the stored security events
const AuditEvent = require("../models/auditEventModel.js");
const logger = require("../utils/logger.js");
const { parseAuditQuery } = require("../utils/audit.js");

/**
 * Lists audit events, newest first, one page at a time, optionally for a single event type
 * ROUTE: GET /api/admin/audit-events
 * ACCESS: Private (Admins only)
 */
const getAuditEvents = async (req, res) => {
  try {
    const query = parseAuditQuery(req.query);
    if (query.error) {
      logger.warn(`Audit events request rejected: ${query.error}`, "SECURITY");
      return res.status(400).json({ success: false, message: query.error });
    }

    const filter = {};
    if (query.type) {
      filter.type = query.type;
    }

    // The page comes from sort, skip and limit, and the total from countDocuments, fetched together (Mongoose, 2026a).
    const [total, events] = await Promise.all([
      AuditEvent.countDocuments(filter),
      AuditEvent.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        // Only the name and role are loaded, so the email address stays out of the response (Mongoose, 2026b).
        .populate("userId", "username role")
        // Plain objects are enough because the events are only read (Mongoose, 2026c).
        .lean(),
    ]);

    // Reading the audit trail is itself recorded (OWASP Foundation, 2026).
    let filterNote = "all types";
    if (query.type) {
      filterNote = `type ${query.type}`;
    }
    logger.info(
      `Audit events viewed by admin ID ${req.user._id}: page ${query.page}, ${events.length} of ${total} events (${filterNote})`,
      "SECURITY"
    );

    const data = events.map((event) => {
      let user = null;
      if (event.userId) {
        user = { username: event.userId.username, role: event.userId.role };
      }
      return {
        id: event._id,
        type: event.type,
        outcome: event.outcome,
        detail: event.detail || null,
        ip: event.ip || null,
        userAgent: event.userAgent || null,
        createdAt: event.createdAt,
        user,
      };
    });

    return res.status(200).json({
      success: true,
      data,
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    });
  } catch (error) {
    logger.error(`Get audit events error: ${error.message}`, "SECURITY", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while loading the audit events.",
    });
  }
};

module.exports = { getAuditEvents };

// Reference List:
// Mongoose, 2026a. Queries. [online] Available at: <https://mongoosejs.com/docs/queries.html> [Accessed 7 November 2026].
// Mongoose, 2026b. Query Population. [online] Available at: <https://mongoosejs.com/docs/populate.html> [Accessed 7 November 2026].
// Mongoose, 2026c. Faster Mongoose Queries With Lean. [online] Available at: <https://mongoosejs.com/docs/tutorials/lean.html> [Accessed 7 November 2026].
// OWASP Foundation, 2026. Logging Cheat Sheet. [online] Available at: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> [Accessed 7 November 2026].
