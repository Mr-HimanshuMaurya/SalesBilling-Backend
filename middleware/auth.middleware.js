const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/apiResponse");
const User = require("../modules/users/user.model");
const { canUserLogin } = require("../modules/users/user.schedule.controller");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return errorResponse(res, "No token, authorization denied", 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, "User not found", 401);
    }

    // ✅ Skip schedule check for Super Admin and Server Admin
    if (user.role !== "superadmin" && user.role !== "server_admin") {
      const loginCheck = await canUserLogin(user._id);

      if (!loginCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: loginCheck.reason,
          code: loginCheck.code,
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return errorResponse(res, "Token is not valid", 401);
  }
};

module.exports = { auth };
