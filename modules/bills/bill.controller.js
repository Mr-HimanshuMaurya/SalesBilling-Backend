const billService = require("./bill.service");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const billModel = require("./bill.model");
const xlsx = require("xlsx");
const { exportBillsToExcel } = require("../../utils/excelExporter");

const createBill = async (req, res) => {
  try {
    const bill = await billService.createBill(req.body, req.user);
    return successResponse(res, bill, "Bill created successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getBills = async (req, res) => {
  try {
    const result = await billService.getBills(req.query, req.user);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getBillById = async (req, res) => {
  try {
    const bill = await billService.getBillById(req.params.id);
    return successResponse(res, bill);
  } catch (error) {
    return errorResponse(res, error.message, 404);
  }
};

const updateBill = async (req, res) => {
  try {
    const bill = await billService.updateBill(
      req.params.id,
      req.body,
      req.user,
    );
    return successResponse(res, bill, "Bill updated successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteBill = async (req, res) => {
  try {
    const result = await billService.deleteBill(req.params.id, req.user);
    return successResponse(res, result, "Bill deleted successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const submitBill = async (req, res) => {
  try {
    const bill = await billService.submitBill(req.params.id, req.user.id);
    return successResponse(
      res,
      bill,
      "Bill submitted for approval successfully",
    );
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const approveBill = async (req, res) => {
  try {
    const bill = await billService.approveBill(
      req.params.id,
      req.user.id,
      req.body.billNumber,
    );

    return successResponse(res, bill, "Bill approved successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const sendForCorrection = async (req, res) => {
  try {
    const bill = await billService.sendForCorrection(
      req.params.id,
      req.user.id,
      req.body.reason,
    );
    return successResponse(res, bill, "Bill sent for correction successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const sendBillEmailToClient = async (req, res) => {
  try {
    const result = await billService.sendBillEmailToClient(
      req.params.id,
      req.user.id,
      req.body?.invoiceType,
    );
    return successResponse(res, result, "Bill email sent successfully");
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const stopRenewalAlerts = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const bill = await billModel.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Check if alerts can be stopped
    const today = new Date();
    const daysLeft = bill.renewalDate
      ? Math.ceil((new Date(bill.renewalDate) - today) / (1000 * 60 * 60 * 24))
      : null;

    if (daysLeft === null || daysLeft > 7) {
      return res.status(400).json({
        success: false,
        message: "Alerts can only be stopped when renewal is within 7 days",
      });
    }

    if (bill.renewalAlertsStopped) {
      return res.status(400).json({
        success: false,
        message: "Alerts already stopped for this bill",
      });
    }

    // Stop alerts
    bill.renewalAlertsStopped = true;
    bill.renewalAlertsStoppedAt = new Date();
    bill.clientRenewed = true;
    bill.clientRenewedAt = new Date();
    await bill.save();

    res.json({
      success: true,
      message: "Renewal alerts stopped successfully",
      bill,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get renewal alert status
const getRenewalAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await billModel.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    const today = new Date();
    const daysLeft = bill.renewalDate
      ? Math.ceil((new Date(bill.renewalDate) - today) / (1000 * 60 * 60 * 24))
      : null;
    const canStopAlerts =
      daysLeft !== null &&
      daysLeft <= 7 &&
      daysLeft >= 0 &&
      !bill.renewalAlertsStopped;

    res.json({
      success: true,
      data: {
        daysLeft,
        alertsStopped: bill.renewalAlertsStopped,
        canStopAlerts,
        reminderSent: bill.reminderSent || [],
        clientRenewed: bill.clientRenewed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const exportBillsExcel = async (req, res) => {
  try {
    const user = req.user;
    const {
      search,
      status,
      service,
      salesPerson,
      renewalFilter,
      renewalStartDate,
      renewalEndDate,
    } = req.query;

    // Build filter (same as getBills)
    const filter = {};

    if (user.role === "sales") {
      filter.createdBy = user.id;
    } else if (user.role === "accountant") {
      filter.status = { $in: ["pending_approval", "approved", "correction"] };
    }

    if (search) {
      const clientIds = await require("../clients/client.model")
        .find({
          $or: [
            { companyName: { $regex: search, $options: "i" } },
            { representativeName: { $regex: search, $options: "i" } },
          ],
        })
        .distinct("_id");

      filter.$or = [
        { billNumber: { $regex: search, $options: "i" } },
        { client: { $in: clientIds } },
      ];
    }

    if (status) filter.status = status;
    if (service) filter.service = service;
    if (salesPerson) filter.createdBy = salesPerson;

    // Renewal date filters
    if (renewalStartDate || renewalEndDate) {
      filter.renewalDate = {};
      if (renewalStartDate)
        filter.renewalDate.$gte = new Date(renewalStartDate);
      if (renewalEndDate) filter.renewalDate.$lte = new Date(renewalEndDate);
    } else if (renewalFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (renewalFilter === "today") {
        filter.renewalDate = { $gte: today, $lt: tomorrow };
      } else if (renewalFilter === "this_week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        filter.renewalDate = { $gte: weekStart, $lt: weekEnd };
      } else if (renewalFilter === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        filter.renewalDate = { $gte: monthStart, $lt: monthEnd };
      }
    }

    // Get all bills matching filter (no pagination)
    const bills = await require("./bill.model")
      .find(filter)
      .populate("client", "companyName representativeName")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    if (bills.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bills found for export",
      });
    }

    // Generate Excel
    const workbook = exportBillsToExcel(bills);

    // Generate filename with date and filter info
    const dateStr = new Date().toISOString().split("T")[0];
    let filename = `Bills_Export_${dateStr}`;

    if (status) filename += `_${status}`;
    if (service) filename += `_${service}`;
    if (renewalFilter) filename += `_${renewalFilter}`;

    filename += ".xlsx";

    // Write buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  submitBill,
  approveBill,
  sendForCorrection,
  sendBillEmailToClient,
  stopRenewalAlerts,
  getRenewalAlertStatus,
  exportBillsExcel,
};
