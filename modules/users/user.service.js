const User = require('./user.model');
const { ROLES } = require('../../constants/roles');

const createUser = async (userData) => {
  if (userData.role === ROLES.SUPERADMIN) {
    throw new Error('Superadmin cannot be created via API');
  }

  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const user = new User(userData);
  await user.save();
  return user;
};

const getUsers = async (query) => {
  const { page = 1, limit = 10, search, role } = query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  return {
    users,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
};

const updateUser = async (id, updateData) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
  return updatedUser;
};

const deleteUser = async (id, currentUserId) => {
  if (id === currentUserId) {
    throw new Error('Superadmin cannot delete themselves');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  await User.findByIdAndDelete(id);
  return { message: 'User deleted successfully' };
};

const toggleUserStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  user.isActive = !user.isActive;
  await user.save();
  return user;
};

module.exports = { createUser, getUsers, updateUser, deleteUser, toggleUserStatus };
