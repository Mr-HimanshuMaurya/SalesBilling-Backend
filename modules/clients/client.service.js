const Client = require('./client.model');
const User = require('../users/user.model');
const Bill = require('../bills/bill.model');
const { ROLES } = require('../../constants/roles');

const createClient = async (clientData, userId) => {
  const client = new Client({
    ...clientData,
    createdBy: userId,
  });
  await client.save();
  return client;
};

const getClients = async (query, user) => {
  const { page = 1, limit = 10, search, salesPerson } = query;

  const filter = {
    email: { $exists: true, $nin: ["", null] },
  };

  if (user.role === ROLES.SALES) {
    filter.createdBy = user.id;
  } else if (salesPerson) {
    filter.createdBy = salesPerson;
  }

  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { representativeName: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Client.countDocuments(filter);

  const clients = await Client.find(filter)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const salesPersons = await User.find({ role: ROLES.SALES }, "name email");

  const clientIds = clients.map((c) => c._id);

  const billCounts = await Bill.aggregate([
    { $match: { client: { $in: clientIds } } },
    { $group: { _id: "$client", count: { $sum: 1 } } },
  ]);

  const billCountMap = {};

  billCounts.forEach((bc) => {
    billCountMap[bc._id.toString()] = bc.count;
  });

  const clientsWithBillCount = clients.map((client) => ({
    ...client.toObject(),
    billCount: billCountMap[client._id.toString()] || 0,
    salesRepName: client.createdBy?.name || client.salesRepName || "N/A",
  }));

  return {
    clients: clientsWithBillCount,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    salesPersons,
  };
};

const getClientById = async (id) => {
  const client = await Client.findById(id).populate('createdBy', 'name email');
  if (!client) {
    throw new Error('Client not found');
  }
  return client;
};

const updateClient = async (id, updateData, user) => {
  const client = await Client.findById(id);
  if (!client) {
    throw new Error('Client not found');
  }

  if (user.role === ROLES.SALES && client.createdBy.toString() !== user.id) {
    throw new Error('Not authorized to update this client');
  }

  const updatedClient = await Client.findByIdAndUpdate(id, updateData, { new: true }).populate('createdBy', 'name email');
  return updatedClient;
};

const deleteClient = async (id) => {
  const client = await Client.findById(id);
  if (!client) {
    throw new Error('Client not found');
  }

  await Client.findByIdAndDelete(id);
  return { message: 'Client deleted successfully' };
};

module.exports = { createClient, getClients, getClientById, updateClient, deleteClient };
