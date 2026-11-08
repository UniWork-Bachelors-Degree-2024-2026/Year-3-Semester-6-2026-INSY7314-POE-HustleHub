// Controller for the public profile members choose to share with each other
const User = require("../models/userModel.js");
const Profile = require("../models/profileModel.js");
const Booking = require("../models/bookingModel.js");
const logger = require("../utils/logger.js");
const { buildProfileUpdate } = require("../utils/profileUpdate.js");

// The fields of a stored profile that other members are allowed to see.
const PUBLIC_FIELDS = [
  "avatar",
  "banner",
  "headline",
  "bio",
  "location",
  "website",
  "linkedin",
  "category",
  "skills",
  "hourlyRate",
  "experience",
  "availability",
  "company",
  "industry",
  "hiring",
  "visible",
];

// Copies only the shareable fields, so ids, timestamps and anything private never leave the server.
const toPublicProfile = (record) => {
  const shared = {};
  for (const field of PUBLIC_FIELDS) {
    shared[field] = record[field];
  }
  return shared;
};

/**
 * Returns what a member has chosen to share, never their email
 * ROUTE -> GET /api/users/:id/profile
 * ACCESS -> Private (requires valid JWT)
 */
const getPublicProfile = async (req, res) => {
  try {
    const member = await User.findById(req.params.id).select("username role createdAt");
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found." });
    }

    const data = { _id: member._id, username: member.username, role: member.role, profile: null };

    const record = await Profile.findOne({ user: member._id });
    if (record && record.visible) {
      // Facts the server works out itself, counted for the side of the booking the member is on
      let side = "client";
      if (member.role === "freelancer") {
        side = "freelancer";
      }
      const completedBookings = await Booking.countDocuments({
        [side]: member._id,
        status: "completed",
      });

      data.stats = { completedBookings, memberSince: member.createdAt };
      data.profile = toPublicProfile(record);
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error(`Get public profile error: ${error.message}`, "APP", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error while loading the profile." });
  }
};

/**
 * Saves the shareable details of the logged in member, only the fields that were sent
 * ROUTE -> PUT /api/users/me/profile
 * ACCESS -> Private (requires valid JWT)
 */
const saveMyProfile = async (req, res) => {
  try {
    // Only the known profile fields, and only as plain values, are passed on to the database
    const update = buildProfileUpdate(req.body);
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No profile details were provided." });
    }

    await Profile.findOneAndUpdate(
      { user: req.user._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    logger.info(`Profile updated for user ID ${req.user._id} ("${req.user.username}")`, "APP");

    return res.status(200).json({ success: true, message: "Profile saved." });
  } catch (error) {
    logger.error(`Save profile error: ${error.message}`, "APP", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: "Profile validation failed." });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error while saving the profile." });
  }
};

module.exports = { getPublicProfile, saveMyProfile };
