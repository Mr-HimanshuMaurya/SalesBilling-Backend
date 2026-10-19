const Server = require("./server.model");
const { successResponse, errorResponse } = require("../../utils/apiResponse");

// Create server
const createServer = async (req, res) => {
  try {
    const serverData = {
      ...req.body,
      createdBy: req.user.id,
    };

    if (!serverData.name || String(serverData.name).trim() === "") {
      return errorResponse(res, "Server name is required", 400);
    }
    if (!serverData.ipAddress || String(serverData.ipAddress).trim() === "") {
      return errorResponse(res, "IP address is required", 400);
    }
    if (!serverData.specs?.cpu) {
      return errorResponse(res, "CPU specs are required", 400);
    }
    if (!serverData.specs?.ram) {
      return errorResponse(res, "RAM specs are required", 400);
    }
    if (!serverData.specs?.storage) {
      return errorResponse(res, "Storage specs are required", 400);
    }

    const server = new Server(serverData);
    await server.save();

    return successResponse(res, server, "Server created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get all servers
const getServers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    const total = await Server.countDocuments(filter);
    const servers = await Server.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    return successResponse(res, {
      servers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get server by ID
const getServerById = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id).populate(
      "createdBy",
      "name email",
    );

    if (!server) {
      return errorResponse(res, "Server not found", 404);
    }

    return successResponse(res, server);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update server
const updateServer = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return errorResponse(res, "Server not found", 404);
    }

    const updatedServer = await Server.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );

    return successResponse(res, updatedServer, "Server updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete server
const deleteServer = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return errorResponse(res, "Server not found", 404);
    }

    // Check if server has assignments
    const ServerAssignment = require("../server-assignments/serverAssignment.model");
    const assignments = await ServerAssignment.findOne({
      server: req.params.id,
    });

    if (assignments) {
      return errorResponse(
        res,
        "Cannot delete server with active assignments",
        400,
      );
    }

    await Server.findByIdAndDelete(req.params.id);
    return successResponse(res, null, "Server deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Toggle server status
const toggleServerStatus = async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return errorResponse(res, "Server not found", 404);
    }

    const statusMap = {
      active: "maintenance",
      maintenance: "active",
      inactive: "active",
      pending: "active",
    };

    server.status = statusMap[server.status] || "active";
    await server.save();

    return successResponse(res, server, "Server status updated");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createServer,
  getServers,
  getServerById,
  updateServer,
  deleteServer,
  toggleServerStatus,
};
