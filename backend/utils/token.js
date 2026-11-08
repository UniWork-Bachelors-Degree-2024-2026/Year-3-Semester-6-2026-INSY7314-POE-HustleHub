// Creates the signed login token, kept in its own file so every controller can use it without circular imports
const jwt = require("jsonwebtoken");

// Helper function to generate JWT token with user id and role (rudderz243, 2026).
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

module.exports = { generateToken };

// Reference List:
// rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
