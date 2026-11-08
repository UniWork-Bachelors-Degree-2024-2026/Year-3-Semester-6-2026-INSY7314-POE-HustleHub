// Import Mongoose and bcrpyt to interact with mongo db and salt and hash passwords
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Schema for a new user
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      default: "client",
    },
    // Tokens issued before this moment are rejected, so a password reset signs every device out
    passwordChangedAt: {
      type: Date,
    },
    // Own security feature: when true, a correct password must be followed by an emailed login code
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    // Own security feature: wrong passwords since the last good login, and the end of any active lock
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-Save hook for password hashing
userSchema.pre("save", async function () {
  // Skip hashing when the caller has already stored a hash (sign up confirmed by one time passcode)
  if (this.$locals.passwordIsHashed) {
    return;
  }

  // If the password hasn't been modified, skip hashing
  if (!this.isModified("password")) {
    return;
  }

  try {
    // 1. Generate cryptographic salt (10 rounds) (rudderz243, 2026).
    const salt = await bcrypt.genSalt(10);
    // 2. Hash the plain text password with the salt
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.error("Error hashing password:", error.message);
    throw error;
  }
});

// Helper function to compare the user input when logging in (which is plain text), with the seasoned password
// in our database (rudderz243, 2026).
userSchema.methods.matchPassword = async function (enteredPassword) {
  // uses the compare method to compare
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
