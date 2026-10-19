const User = require("../users/user.model");
const jwt = require("jsonwebtoken");
const { canUserLogin } = require("../users/user.schedule.controller");

const login = async (email, password) => {
  console.log("Auth Service - Login attempt:", email);

  const user = await User.findOne({ email });
  console.log("Auth Service - User found:", user ? "Yes" : "No");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    throw new Error("Your account has been deactivated. Please contact admin.");
  }

  const isMatch = await user.comparePassword(password);
  console.log("Auth Service - Password match:", isMatch ? "Yes" : "No");

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  // ✅ Skip schedule check for Super Admin and Server Admin
  if (user.role !== "superadmin" && user.role !== "server_admin") {
    const loginCheck = await canUserLogin(user._id);

    if (!loginCheck.allowed) {
      const error = new Error(loginCheck.reason);
      error.code = loginCheck.code;
      error.statusCode = 403;
      throw error;
    }
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

module.exports = { login, getMe };
