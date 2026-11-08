const mongoose = require("mongoose");
const { GIG_CATEGORIES } = require("./gigModel.js");

// Allowed values for the fixed choice fields, shared with the validators.
const PROFILE_BANNERS = Object.freeze(["ocean", "aurora", "midnight", "glacier"]);
const PROFILE_AVAILABILITY = Object.freeze(["available", "busy", "away"]);
const PROFILE_EXPERIENCE = Object.freeze(["<1", "1-3", "3-5", "5-10", "10+"]);
const AVATAR_MAX_LENGTH = 400000;

// Public details a member chooses to share. Kept apart from the user so every login does not load the photo.
const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // When false the profile is stored but never returned to other members
    visible: { type: Boolean, default: true },
    // Cropped photo as a data URL, empty means the initials fallback
    avatar: { type: String, default: "", maxlength: AVATAR_MAX_LENGTH },
    banner: { type: String, enum: PROFILE_BANNERS, default: "ocean" },
    headline: { type: String, default: "", maxlength: 80 },
    bio: { type: String, default: "", maxlength: 500 },
    location: { type: String, default: "", maxlength: 60 },
    website: { type: String, default: "", maxlength: 200 },
    linkedin: { type: String, default: "", maxlength: 200 },
    // Freelancer details
    category: { type: String, default: "", enum: ["", ...GIG_CATEGORIES] },
    skills: { type: [String], default: [] },
    hourlyRate: { type: String, default: "", maxlength: 5 },
    experience: { type: String, default: "", enum: ["", ...PROFILE_EXPERIENCE] },
    availability: { type: String, enum: PROFILE_AVAILABILITY, default: "available" },
    // Client details
    company: { type: String, default: "", maxlength: 60 },
    industry: { type: String, default: "", maxlength: 60 },
    hiring: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

const Profile = mongoose.model("Profile", profileSchema);

module.exports = Profile;
module.exports.PROFILE_BANNERS = PROFILE_BANNERS;
module.exports.PROFILE_AVAILABILITY = PROFILE_AVAILABILITY;
module.exports.PROFILE_EXPERIENCE = PROFILE_EXPERIENCE;
module.exports.AVATAR_MAX_LENGTH = AVATAR_MAX_LENGTH;
