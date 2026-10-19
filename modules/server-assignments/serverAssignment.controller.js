const ServerAssignment = require("./serverAssignment.model");
const Server = require("../servers/server.model");
const Client = require("../clients/client.model");
const { successResponse, errorResponse } = require("../../utils/apiResponse");

// Create assignment
const createAssignment = async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      assignedBy: req.user.id,
    };

    if (!assignmentData.server || String(assignmentData.server).trim() === "") {
      return errorResponse(res, "Server is required", 400);
    }
    if (!assignmentData.client || String(assignmentData.client).trim() === "") {
      return errorResponse(res, "Client is required", 400);
    }
    if (!assignmentData.validityStart) {
      return errorResponse(res, "Valid from date is required", 400);
    }
    if (!assignmentData.validityEnd) {
      return errorResponse(res, "Valid until date is required", 400);
    }
    if (new Date(assignmentData.validityEnd) < new Date(assignmentData.validityStart)) {
      return errorResponse(res, "Valid until must be after valid from", 400);
    }

    // Check if server exists
    const server = await Server.findById(assignmentData.server);
    if (!server) {
      return errorResponse(res, "Server not found", 404);
    }

    // Check if client exists
    const client = await Client.findById(assignmentData.client);
    if (!client) {
      return errorResponse(res, "Client not found", 404);
    }

    // Check if client already assigned to this server
    const existingAssignment = await ServerAssignment.findOne({
      client: assignmentData.client,
      server: assignmentData.server,
      status: "active",
    });

    if (existingAssignment) {
      return errorResponse(res, "Client already assigned to this server", 400);
    }

    const assignment = new ServerAssignment(assignmentData);
    await assignment.save();

    // Update server total clients count
    server.totalClients = await ServerAssignment.countDocuments({
      server: server._id,
      status: "active",
    });
    await server.save();

    return successResponse(
      res,
      assignment,
      "Assignment created successfully",
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get all assignments
const getAssignments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      serverId,
      clientId,
      sortByIp, // "" | "asc" | "desc"
    } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (serverId) filter.server = serverId;
    if (clientId) filter.client = clientId;

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      const clients = await Client.find({
        $or: [
          { companyName: searchRegex },
          { representativeName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
          { address: searchRegex },
          { city: searchRegex },
          { state: searchRegex },
        ],
      }).distinct("_id");

      const servers = await Server.find({
        $or: [
          { name: searchRegex },
          { ipAddress: searchRegex },
          { location: searchRegex },
          { provider: searchRegex },
        ],
      }).distinct("_id");

      filter.$or = [
        { client: { $in: clients } },
        { server: { $in: servers } },
        {
          sharedUserDetails: {
            $elemMatch: { username: searchRegex },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);

    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "servers",
          localField: "server",
          foreignField: "_id",
          as: "server",
        },
      },
      { $unwind: { path: "$server", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "assignedBy",
          foreignField: "_id",
          as: "assignedBy",
        },
      },
      { $unwind: { path: "$assignedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          client: {
            _id: 1,
            companyName: 1,
            representativeName: 1,
            email: 1,
            phone: 1,
            address: 1,
            city: 1,
            state: 1,
            country: 1,
            pincode: 1,
          },
          server: {
            _id: 1,
            name: 1,
            ipAddress: 1,
            status: 1,
            specs: 1,
            location: 1,
          },
          assignedBy: { name: 1, email: 1 },
          serverType: 1,
          sharedUsers: 1,
          sharedUserDetails: 1,
          configuration: 1,
          windowsKey: 1,
          windowsKeyLastDigits: 1,
          validityStart: 1,
          validityEnd: 1,
          status: 1,
          notes: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    if (sortByIp === "asc" || sortByIp === "desc") {
      const dir = sortByIp === "asc" ? 1 : -1;
      pipeline.push(
        {
          $addFields: {
            __ipParts: {
              $map: {
                input: { $split: [{ $ifNull: ["$server.ipAddress", ""] }, "."] },
                as: "p",
                in: { $toInt: "$$p" },
              },
            },
          },
        },
        {
          $addFields: {
            __ipNum: {
              $let: {
                vars: {
                  p0: { $arrayElemAt: ["$__ipParts", 0] },
                  p1: { $arrayElemAt: ["$__ipParts", 1] },
                  p2: { $arrayElemAt: ["$__ipParts", 2] },
                  p3: { $arrayElemAt: ["$__ipParts", 3] },
                },
                in: {
                  $add: [
                    { $multiply: [{ $ifNull: ["$$p0", 0] }, 16777216] },
                    { $multiply: [{ $ifNull: ["$$p1", 0] }, 65536] },
                    { $multiply: [{ $ifNull: ["$$p2", 0] }, 256] },
                    { $ifNull: ["$$p3", 0] },
                  ],
                },
              },
            },
          },
        },
        { $sort: { __ipNum: dir, createdAt: -1 } },
        { $project: { __ipParts: 0, __ipNum: 0 } },
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    const countPipeline = [{ $match: filter }, { $count: "total" }];
    const countResult = await ServerAssignment.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: parseInt(skip) }, { $limit: limitNum });

    const assignments = await ServerAssignment.aggregate(pipeline);

    return successResponse(res, {
      assignments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get assignment by ID
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await ServerAssignment.findById(req.params.id)
      .populate("client", "companyName representativeName email phone")
      .populate("server", "name ipAddress status specs")
      .populate("assignedBy", "name email");

    if (!assignment) {
      return errorResponse(res, "Assignment not found", 404);
    }

    return successResponse(res, assignment);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Update assignment
const updateAssignment = async (req, res) => {
  try {
    const assignment = await ServerAssignment.findById(req.params.id);
    if (!assignment) {
      return errorResponse(res, "Assignment not found", 404);
    }

    const updatedAssignment = await ServerAssignment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true },
    );

    return successResponse(
      res,
      updatedAssignment,
      "Assignment updated successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Delete assignment
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await ServerAssignment.findById(req.params.id);
    if (!assignment) {
      return errorResponse(res, "Assignment not found", 404);
    }

    await ServerAssignment.findByIdAndDelete(req.params.id);

    // Update server total clients count
    const server = await Server.findById(assignment.server);
    if (server) {
      server.totalClients = await ServerAssignment.countDocuments({
        server: server._id,
        status: "active",
      });
      await server.save();
    }

    return successResponse(res, null, "Assignment deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Get expiring assignments (upcoming + already expired)
const getExpiringAssignments = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiringDate = new Date(today);
    expiringDate.setDate(expiringDate.getDate() + parseInt(days));
    expiringDate.setHours(23, 59, 59, 999);
    const nowPlus1Day = new Date(today);
    nowPlus1Day.setHours(23, 59, 59, 999);

    const upcomingExpiring = await ServerAssignment.find({
      validityEnd: {
        $gte: today,
        $lte: expiringDate,
      },
    })
      .populate("client", "companyName representativeName email phone address city state country pincode")
      .populate("server", "name ipAddress specs location")
      .sort({ validityEnd: 1 });

    const alreadyExpired = await ServerAssignment.find({
      validityEnd: {
        $lt: nowPlus1Day,
      },
    })
      .populate("client", "companyName representativeName email phone address city state country pincode")
      .populate("server", "name ipAddress specs location")
      .sort({ validityEnd: -1 });

    return successResponse(res, {
      upcomingExpiring,
      alreadyExpired,
      assignments: [...upcomingExpiring, ...alreadyExpired],
      upcomingCount: upcomingExpiring.length,
      expiredCount: alreadyExpired.length,
      count: upcomingExpiring.length + alreadyExpired.length,
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getExpiringAssignments,
};
