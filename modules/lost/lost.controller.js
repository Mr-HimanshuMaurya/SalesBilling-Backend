const Bill = require("../bills/bill.model");

// POST /api/lost/:billId/mark
const markAsLost = async (req, res) => {
  try {
    const { billId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Reason is required and must be at least 5 characters",
      });
    }

    let bill = await Bill.findById(billId).populate(
      "client",
      "companyName representativeName phone email",
    );

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    bill.isLost = true;
    bill.lostReason = reason.trim();
    bill.lostMarkedAt = new Date();
    bill.lostMarkedBy = req.user.id;

    await bill.save();

    bill = await Bill.findById(billId)
      .populate("client", "companyName representativeName phone email")
      .populate("lostMarkedBy", "name");

    res.status(200).json({
      success: true,
      message: "Client marked as lost successfully",
      bill,
    });
  } catch (error) {
    console.error("Error marking bill as lost:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/lost
const getLostClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let bills;
    let total;

    if (search) {
      const searchRegex = new RegExp(search, "i");

      const aggregatePipeline = [
        { $match: { isLost: true } },
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "createdBy",
          },
        },
        { $unwind: "$createdBy" },
        {
          $lookup: {
            from: "users",
            localField: "lostMarkedBy",
            foreignField: "_id",
            as: "lostMarkedBy",
          },
        },
        {
          $unwind: {
            path: "$lostMarkedBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [
              { "client.companyName": searchRegex },
              { billNumber: searchRegex },
            ],
          },
        },
      ];

      const totalPipeline = [...aggregatePipeline, { $count: "total" }];
      const billsPipeline = [
        ...aggregatePipeline,
        { $sort: { lostMarkedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      const [totalResult, billsResult] = await Promise.all([
        Bill.aggregate(totalPipeline),
        Bill.aggregate(billsPipeline),
      ]);

      bills = billsResult;
      total = totalResult.length > 0 ? totalResult[0].total : 0;
    } else {
      const filter = { isLost: true };

      const [billsResult, totalResult] = await Promise.all([
        Bill.find(filter)
          .populate("client", "companyName representativeName phone email")
          .populate("createdBy", "name")
          .populate("lostMarkedBy", "name")
          .sort({ lostMarkedAt: -1 })
          .skip(skip)
          .limit(limit),
        Bill.countDocuments(filter),
      ]);

      bills = billsResult;
      total = totalResult;
    }

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      bills,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching lost clients:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  markAsLost,
  getLostClients,
};
