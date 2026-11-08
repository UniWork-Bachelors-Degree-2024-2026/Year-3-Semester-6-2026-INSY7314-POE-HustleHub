// One stored record for each security event, so the history survives outside the log files
const mongoose = require("mongoose");

const { EVENT_TYPES, OUTCOMES, RETENTION_DAYS } = require("../utils/audit.js");

const auditEventSchema = new mongoose.Schema(
  {
    // Empty when the event cannot be tied to an account, such as a login for an email that does not exist
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
    },
    outcome: {
      type: String,
      enum: OUTCOMES,
      required: true,
    },
    // A fixed phrase chosen by the code, never text typed by the user
    detail: {
      type: String,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// The admin page lists the newest events first, optionally for one type
auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ type: 1, createdAt: -1 });

// A TTL index removes each record a fixed time after it was created (MongoDB, 2026).
auditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model("AuditEvent", auditEventSchema);

// Reference List:
// MongoDB, 2026. Expire Data from Collections by Setting TTL. [online] Available at: <https://www.mongodb.com/docs/manual/core/index-ttl/> [Accessed 10 October 2026].
