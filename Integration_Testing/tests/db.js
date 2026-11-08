// Database access for the tests that need an emailed code, and token signing for the session tests.
// The API only stores a hash of each code, so the test swaps in the hash of a code it knows.
const crypto = require("crypto");
const path = require("path");

const backendDir = path.join(__dirname, "..", "..", "backend");
require(path.join(backendDir, "node_modules", "dotenv")).config({
  path: path.join(backendDir, ".env"),
  quiet: true,
});

const mongoose = require(path.join(backendDir, "node_modules", "mongoose"));
const User = require(path.join(backendDir, "models", "userModel.js"));
const Otp = require(path.join(backendDir, "models", "otpModel.js"));
const { hashCode } = require(path.join(backendDir, "utils", "otp.js"));
const jwt = require(path.join(backendDir, "node_modules", "jsonwebtoken"));

const connect = async () => {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.CONN_STRING);
};

const disconnect = () => mongoose.disconnect();

const setKnownCode = async (email, purpose) => {
  await connect();
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  for (let tries = 0; tries < 40; tries++) {
    const updated = await Otp.findOneAndUpdate(
      { email, purpose },
      { codeHash: hashCode(email, purpose, code), attempts: 0 }
    );
    if (updated) return code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No ${purpose} code was stored for ${email}`);
};

const wrongCodeFor = (code) => String((Number(code) + 1) % 1000000).padStart(6, "0");

const findUser = async (email) => {
  await connect();
  return User.findOne({ email }).lean();
};

const resetTwoFactor = async (email) => {
  await connect();
  await User.updateOne({ email }, { twoFactorEnabled: false });
  await Otp.deleteMany({ email, purpose: "login" });
};

// A correctly signed token that expired an hour ago, so only the expiry check can refuse it
const expiredTokenFor = async (email) => {
  const user = await findUser(email);
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { id: String(user._id), role: user.role, iat: now - 7200, exp: now - 3600 },
    process.env.JWT_SECRET
  );
};

module.exports = {
  setKnownCode,
  wrongCodeFor,
  findUser,
  resetTwoFactor,
  expiredTokenFor,
  disconnect,
};
