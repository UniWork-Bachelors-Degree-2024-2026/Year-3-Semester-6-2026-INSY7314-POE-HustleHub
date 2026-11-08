const mongoose = require("mongoose");

const OTP_PURPOSES = Object.freeze(["register", "reset", "login"]);

// One pending passcode per email and purpose, holding the sign up details until the code is confirmed.
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: OTP_PURPOSES,
      required: true,
    },
    // Keyed hash of the code, the code itself is never stored
    codeHash: {
      type: String,
      required: true,
    },
    // Wrong guesses so far, the code is destroyed once the limit is reached
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Sign up details, only used when purpose is register (the password is already hashed)
    username: { type: String },
    passwordHash: { type: String },
    role: { type: String },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

// A TTL index with expireAfterSeconds 0 removes each record once expiresAt has passed (MongoDB, 2026).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model("Otp", otpSchema);

module.exports = Otp;
module.exports.OTP_PURPOSES = OTP_PURPOSES;

// Reference List:
// MongoDB, 2026. Expire Data from Collections by Setting TTL. [online] Available at: <https://www.mongodb.com/docs/manual/core/index-ttl/> [Accessed 10 October 2026].
