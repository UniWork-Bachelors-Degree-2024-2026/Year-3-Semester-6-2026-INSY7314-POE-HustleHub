const mongoose = require("mongoose");

// Lists of allowed categories and statuses for gigs.
// Object.freeze makes sure these lists cannot be changed anywhere in our code (MDN Web Docs, 2026).
const GIG_CATEGORIES = Object.freeze([
  "Programming & Tech",
  "Graphic & Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation",
  "Music & Audio",
  "Business",
  "Other",
]);

const GIG_STATUS = Object.freeze(["active", "paused", "draft"]);

// Schema layout for a gig listing
const gigSchema = new mongoose.Schema(
  {
    // Short title for the service (e.g., "Full-Stack Web Development")
    title: {
      type: String,
      required: [true, "Gig title is required"],
      trim: true,
      minlength: [5, "Gig title must be at least 5 characters long"],
      maxlength: [100, "Gig title cannot exceed 100 characters"],
    },
    // Detailed description of what the freelancer will do
    description: {
      type: String,
      required: [true, "Gig description is required"],
      trim: true,
      minlength: [20, "Gig description must be at least 20 characters long"],
      maxlength: [2000, "Gig description cannot exceed 2000 characters"],
    },
    // Category selected from the allowed categories list above
    category: {
      type: String,
      required: [true, "Gig category is required"],
      trim: true,
      enum: {
        values: GIG_CATEGORIES,
        message: "{VALUE} is not a supported category",
      },
      index: true,
    },
    // Cost of the gig in ZAR (must be at least 1)
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [1, "Price must be at least 1.00 ZAR"],
      validate: {
        validator: Number.isFinite,
        message: "Price must be a valid, finite number",
      },
    },
    // Number of days the freelancer will take to finish the work
    deliveryTimeDays: {
      type: Number,
      required: [true, "Delivery time in days is required"],
      min: [1, "Delivery time must be at least 1 day"],
      max: [90, "Delivery time cannot exceed 90 days"],
      validate: {
        validator: Number.isInteger,
        message: "Delivery time must be an integer number of days",
      },
    },
    // Links this gig directly to the freelancer user account who created it
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A gig must be associated with a freelancer"],
      index: true,
    },
    // Current listing status: active (visible to all), paused (hidden), or draft
    status: {
      type: String,
      enum: {
        values: GIG_STATUS,
        message: "{VALUE} is not a valid status",
      },
      default: "active",
      index: true,
    },
  },
  {
    // Automatically creates and manages createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Index to make searching and browsing gigs in the marketplace faster
gigSchema.index({ status: 1, category: 1, createdAt: -1 });

const Gig = mongoose.model("Gig", gigSchema);

// Attach the enums directly to the Gig model so other files can easily use them (e.g. Gig.CATEGORIES)
Gig.CATEGORIES = GIG_CATEGORIES;
Gig.STATUS = GIG_STATUS;

// Export the model and the enums
module.exports = Gig;
module.exports.Gig = Gig;
module.exports.GIG_CATEGORIES = GIG_CATEGORIES;
module.exports.GIG_STATUS = GIG_STATUS;

// Reference List:
// MDN Web Docs, 2026. Object.freeze(). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze> [Accessed 23 September 2026].
