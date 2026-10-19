const Bill = require("./bill.model");
const { ROLES } = require("../../constants/roles");

// Get revenue statistics
const getRevenueStats = async (req, res) => {
  try {
    const user = req.user;
    const { startDate, endDate } = req.query;

    // Base filter - only approved bills
    const baseFilter = { status: "approved" };

    // If sales person, only their bills
    if (user.role === ROLES.SALES) {
      baseFilter.createdBy = user.id;
    }

    // Date range filter if provided
    if (startDate || endDate) {
      baseFilter.billingDate = {};
      if (startDate) baseFilter.billingDate.$gte = new Date(startDate);
      if (endDate) baseFilter.billingDate.$lte = new Date(endDate);
    }

    // 1. Overall Total Amount
    const overallResult = await Bill.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const overallTotal = overallResult.length > 0 ? overallResult[0].total : 0;

    // 2. This Month Amount
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const thisMonthFilter = {
      ...baseFilter,
      billingDate: {
        $gte: thisMonthStart,
        $lte: thisMonthEnd,
      },
    };

    const thisMonthResult = await Bill.aggregate([
      { $match: thisMonthFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const thisMonthTotal =
      thisMonthResult.length > 0 ? thisMonthResult[0].total : 0;

    // 3. Previous Month Amount
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const prevMonthFilter = {
      ...baseFilter,
      billingDate: {
        $gte: prevMonthStart,
        $lte: prevMonthEnd,
      },
    };

    const prevMonthResult = await Bill.aggregate([
      { $match: prevMonthFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const prevMonthTotal =
      prevMonthResult.length > 0 ? prevMonthResult[0].total : 0;

    // Additional Stats
    // Count of bills this month
    const thisMonthCount = await Bill.countDocuments(thisMonthFilter);

    // Count of bills previous month
    const prevMonthCount = await Bill.countDocuments(prevMonthFilter);

    // Calculate growth percentage
    let growthPercentage = 0;
    if (prevMonthTotal > 0) {
      growthPercentage =
        ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
    }

    res.json({
      success: true,
      data: {
        overall: {
          total: overallTotal,
          formatted: `₹${overallTotal.toLocaleString("en-IN")}`,
        },
        thisMonth: {
          total: thisMonthTotal,
          formatted: `₹${thisMonthTotal.toLocaleString("en-IN")}`,
          count: thisMonthCount,
          month: now.toLocaleString("default", { month: "long" }),
        },
        previousMonth: {
          total: prevMonthTotal,
          formatted: `₹${prevMonthTotal.toLocaleString("en-IN")}`,
          count: prevMonthCount,
          month: new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString(
            "default",
            { month: "long" },
          ),
        },
        growth: {
          percentage: growthPercentage.toFixed(2),
          isPositive: growthPercentage >= 0,
          label: growthPercentage >= 0 ? "↑ Growth" : "↓ Decline",
        },
      },
    });
  } catch (error) {
    console.error("Error getting revenue stats:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get revenue by month (for charts)
const getRevenueByMonth = async (req, res) => {
  try {
    const user = req.user;
    const { months = 6 } = req.query;

    const baseFilter = { status: "approved" };
    if (user.role === ROLES.SALES) {
      baseFilter.createdBy = user.id;
    }

    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - parseInt(months) + 1,
      1,
    );

    const matchFilter = {
      ...baseFilter,
      billingDate: { $gte: startDate },
    };

    const result = await Bill.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: "$billingDate" },
            month: { $month: "$billingDate" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format result
    const formattedResult = result.map((item) => ({
      month: new Date(item._id.year, item._id.month - 1, 1).toLocaleString(
        "default",
        { month: "short" },
      ),
      year: item._id.year,
      total: item.total,
      formatted: `₹${item.total.toLocaleString("en-IN")}`,
      count: item.count,
    }));

    res.json({
      success: true,
      data: formattedResult,
    });
  } catch (error) {
    console.error("Error getting revenue by month:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getRevenueStats,
  getRevenueByMonth,
};
