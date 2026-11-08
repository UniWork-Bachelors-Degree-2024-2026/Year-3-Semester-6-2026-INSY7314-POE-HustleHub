// Controller for managing gigs on HustleHub+
const mongoose = require("mongoose");
const Gig = require("../models/gigModel.js");
const { GIG_CATEGORIES } = require("../models/gigModel.js");
const { escapeRegex } = require("../middleware/sanitizeMiddleware.js");
const logger = require("../utils/logger.js");

// Creates a new gig listing (freelancers and admins only)
// ROUTE -> POST /api/gigs
const createGig = async (req, res) => {
  try {
    const { title, description, category, price, deliveryTimeDays, status } = req.body;

    // Create the gig and set the logged-in user as the owner
    const gig = await Gig.create({
      title,
      description,
      category,
      price,
      deliveryTimeDays,
      status: status || "active",
      freelancer: req.user._id,
    });

    logger.info(
      `Gig created successfully: "${gig.title}" (ID: ${gig._id}, Price: R${gig.price}) by freelancer "${req.user.username}" (${req.user._id})`,
      "GIGS"
    );

    // Load the freelancer's basic profile info to return with the gig
    const populatedGig = await Gig.findById(gig._id).populate("freelancer", "username email role");

    return res.status(201).json({
      success: true,
      message: "Gig created successfully.",
      data: populatedGig,
    });
  } catch (error) {
    logger.error(`Create gig error: ${error.message}`, "GIGS", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: "Validation error.", errors: messages });
    }
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while creating the gig.",
    });
  }
};

// Gets all active gigs with optional search and category filters (public)
// ROUTE -> GET /api/gigs
const getAllGigs = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, freelancer } = req.query;
    const filter = {};

    // Public browsing only ever returns active gigs, whatever status is requested
    filter.status = "active";

    // Filter by category only when it is a single allowed value
    if (typeof category === "string" && GIG_CATEGORIES.includes(category)) {
      filter.category = category;
    }

    // Filter by specific freelancer (e.g. portfolio view) when the id is a 24 character hex string
    // isObjectIdOrHexString only accepts an ObjectId or a 24 character hex string (Mongoose, 2026).
    if (typeof freelancer === "string" && mongoose.isObjectIdOrHexString(freelancer)) {
      filter.freelancer = freelancer;
    }

    // Filter by price range, ignoring values that are not finite numbers
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (typeof minPrice === "string" && Number.isFinite(min))
      filter.price = { ...filter.price, $gte: min };
    if (typeof maxPrice === "string" && Number.isFinite(max))
      filter.price = { ...filter.price, $lte: max };

    // Keyword search text is escaped before it becomes a regex, because an injected pattern can hang the match (OWASP, 2026b).
    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim().slice(0, 100)), "i");
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const gigs = await Gig.find(filter)
      .populate("freelancer", "username role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: gigs.length,
      data: gigs,
    });
  } catch (error) {
    logger.error(`Get all gigs error: ${error.message}`, "GIGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving gigs.",
    });
  }
};

// Gets all gigs belonging to the logged-in freelancer
// ROUTE -> GET /api/gigs/my-gigs
const getMyGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ freelancer: req.user._id })
      .populate("freelancer", "username email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: gigs.length,
      data: gigs,
    });
  } catch (error) {
    logger.error(`Get my gigs error: ${error.message}`, "GIGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while fetching your gigs.",
    });
  }
};

// Gets a single gig by its ID (public)
// ROUTE -> GET /api/gigs/:id
const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id).populate("freelancer", "username role");

    if (!gig) {
      logger.warn(`Gig fetch failed: ID ${req.params.id} not found`, "GIGS");
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: gig,
    });
  } catch (error) {
    logger.error(`Get gig by ID error: ${error.message}`, "GIGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while fetching the gig.",
    });
  }
};

// Updates an existing gig (only the owner freelancer or admin can edit)
// ROUTE -> PUT /api/gigs/:id
const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      logger.warn(`Gig update failed: ID ${req.params.id} not found`, "GIGS");
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    // Make sure the logged-in user owns this gig (or is an admin)
    const isOwner = gig.freelancer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      logger.warn(
        `Unauthorized gig update attempt on ID ${req.params.id} by user "${req.user.username}" (${req.user.role})`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to modify a gig that does not belong to you.",
      });
    }

    // Update only the fields that were provided
    const { title, description, category, price, deliveryTimeDays, status } = req.body;
    if (title !== undefined) gig.title = title;
    if (description !== undefined) gig.description = description;
    if (category !== undefined) gig.category = category;
    if (price !== undefined) gig.price = price;
    if (deliveryTimeDays !== undefined) gig.deliveryTimeDays = deliveryTimeDays;
    if (status !== undefined) gig.status = status;

    const updatedGig = await gig.save();

    logger.info(
      `Gig updated successfully: "${updatedGig.title}" (ID: ${updatedGig._id}) by user "${req.user.username}"`,
      "GIGS"
    );

    const populatedGig = await Gig.findById(updatedGig._id).populate(
      "freelancer",
      "username email role"
    );

    return res.status(200).json({
      success: true,
      message: "Gig updated successfully.",
      data: populatedGig,
    });
  } catch (error) {
    logger.error(`Update gig error: ${error.message}`, "GIGS", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ success: false, message: "Validation error.", errors: messages });
    }
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while updating the gig.",
    });
  }
};

// Deletes a gig (only the owner freelancer or admin can delete)
// ROUTE -> DELETE /api/gigs/:id
const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);

    if (!gig) {
      logger.warn(`Gig deletion failed: ID ${req.params.id} not found`, "GIGS");
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    // Make sure the logged-in user owns this gig (or is an admin)
    const isOwner = gig.freelancer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      logger.warn(
        `Unauthorized gig delete attempt on ID ${req.params.id} by user "${req.user.username}" (${req.user.role})`,
        "SECURITY"
      );
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to delete a gig that does not belong to you.",
      });
    }

    await Gig.findByIdAndDelete(req.params.id);

    logger.info(
      `Gig deleted successfully: ID ${req.params.id} by user "${req.user.username}"`,
      "GIGS"
    );

    return res.status(200).json({
      success: true,
      message: "Gig deleted successfully.",
    });
  } catch (error) {
    logger.error(`Delete gig error: ${error.message}`, "GIGS", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while deleting the gig.",
    });
  }
};

module.exports = {
  createGig,
  getAllGigs,
  getMyGigs,
  getGigById,
  updateGig,
  deleteGig,
};

// Reference List:
// OWASP, 2026b. Regular expression Denial of Service - ReDoS. [online] Available at: <https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS> [Accessed 8 October 2026].
// Mongoose, 2026. Mongoose.prototype.isObjectIdOrHexString(). [online] Available at: <https://mongoosejs.com/docs/api/mongoose.html#Mongoose.prototype.isObjectIdOrHexString()> [Accessed 10 October 2026].
