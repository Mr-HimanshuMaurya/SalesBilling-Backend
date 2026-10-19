const successResponse = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const errorResponse = (res, message = 'Error', statusCode = 400) =>
  res.status(statusCode).json({ success: false, message });

module.exports = { successResponse, errorResponse };
