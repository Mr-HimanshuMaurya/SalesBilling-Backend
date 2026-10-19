const clientService = require("./client.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const clientModel = require("./client.model");
const Bill = require("../bills/bill.model");
const createClient = async (req, res) => {
  try {
    const client = await clientService.createClient(req.body, req.user.id);
    return successResponse(res, client, "Client created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getClients = async (req, res) => {
  try {
    const result = await clientService.getClients(req.query, req.user);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    return successResponse(res, client);
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const updateClient = async (req, res) => {
  try {
    const client = await clientService.updateClient(
      req.params.id,
      req.body,
      req.user,
    );
    return successResponse(res, client, "Client updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteClient = async (req, res) => {
  try {
    const result = await clientService.deleteClient(req.params.id);
    return successResponse(res, result, "Client deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getClientsWithoutBills = async (req, res) => {
  try {
    // Get clients that have an email
    const allClients = await clientModel
      .find({
        email: { $exists: true, $nin: ["", null] },
      })
      .populate("createdBy", "name email")
      .lean();

    // Get all client IDs that have at least one bill
    const clientsWithBillsData = await Bill.distinct("client");

    const clientIdsWithBills = new Set(
      clientsWithBillsData.filter(Boolean).map((id) => id.toString()),
    );

    // Filter clients that do not have any bills
    const clientsWithoutBills = allClients.filter(
      (client) => !clientIdsWithBills.has(client._id.toString()),
    );

    const totalClients = allClients.length;
    const clientsWithBills = totalClients - clientsWithoutBills.length;

    const percentageWithoutBills =
      totalClients > 0
        ? ((clientsWithoutBills.length / totalClients) * 100).toFixed(2)
        : "0.00";

    return res.json({
      success: true,
      data: {
        clients: clientsWithoutBills,
        summary: {
          totalClients,
          clientsWithBills,
          clientsWithoutBills: clientsWithoutBills.length,
          percentageWithoutBills,
        },
      },
    });
  } catch (error) {
    console.error("Error getting clients without bills:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getClientBillStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await clientModel
      .findById(id)
      .populate("createdBy", "name email");

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found",
      });
    }

    const bills = await Bill.find({ client: id }).sort({
      createdAt: -1,
    });

    const totalAmount = bills.reduce(
      (sum, bill) => sum + (Number(bill.amount) || 0),
      0,
    );

    return res.json({
      success: true,
      data: {
        client,
        bills,
        hasBills: bills.length > 0,
        totalBills: bills.length,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Error getting client bill status:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientsWithoutBills,
  getClientBillStatus,
};
