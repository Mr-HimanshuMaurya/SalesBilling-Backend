const userService = require('./user.service');
const { successResponse, errorResponse } = require('../../utils/apiResponse');

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    return successResponse(res, user, 'User created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await userService.getUsers(req.query);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return successResponse(res, user, 'User updated successfully');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await userService.deleteUser(req.params.id, req.user.id);
    return successResponse(res, result, 'User deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await userService.toggleUserStatus(req.params.id);
    return successResponse(res, user, 'User status updated successfully');
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { createUser, getUsers, updateUser, deleteUser, toggleUserStatus };
