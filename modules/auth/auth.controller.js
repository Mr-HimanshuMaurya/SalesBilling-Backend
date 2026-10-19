const authService = require("./auth.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return successResponse(res, result, "Login successful");
  } catch (error) {
    if (
      error.code === "OUTSIDE_OFFICE_HOURS" ||
      error.code === "NON_WORKING_DAY" ||
      error.code === "DEVICE_NOT_REGISTERED"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: error.code,
      });
    }
    return errorResponse(res, error.message, error.statusCode || 401);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, user);
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

module.exports = { login, getMe };
