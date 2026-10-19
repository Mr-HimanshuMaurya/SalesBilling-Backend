const Bill = require("./bill.model");
const Client = require("../clients/client.model");
const User = require("../users/user.model");
const { ROLES } = require("../../constants/roles");
const { generatePdf } = require("../../utils/pdfGenerator");
const { sendBillEmail } = require("../../utils/email");

const generateBillNumber = async () => {
  const prefix = "AE/";

  const latestBill = await Bill.findOne({
    billNumber: { $regex: "^AE/\\d+$" },
  }).sort({ billNumber: -1 });

  let nextNumber = 2002;

  if (latestBill) {
    const latestNumber = parseInt(latestBill.billNumber.split("/")[1], 10);

    nextNumber = latestNumber + 1;
  }

  return `${prefix}${nextNumber}`;
};

const normalizeLineItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return {
        description: String(item.description || "").trim(),
        quantity,
        rate,
        amount: Number((quantity * rate).toFixed(2)),
      };
    })
    .filter((item) => item.description && item.quantity > 0);

const resolveTaxableAmount = (billData, lineItems) => {
  if (lineItems.length > 0) {
    return Number(
      lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
    );
  }
  return Number(billData.amount) || 0;
};

const createBill = async (billData, user) => {
  const userId = user.id;
  const client = await Client.findById(billData.clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  const lineItems = normalizeLineItems(billData.lineItems);
  if (lineItems.length === 0 && !billData.amount) {
    throw new Error("Add at least one item or provide amount");
  }

  const amount = resolveTaxableAmount(billData, lineItems);
  if (amount <= 0) {
    throw new Error("Bill amount must be greater than 0");
  }

  const gstType = billData.gstType === "CGST_SGST" ? "CGST_SGST" : "IGST";

  const billNumber = await generateBillNumber();
  const isAdminDirect = user.role === ROLES.SUPERADMIN;

  const bill = new Bill({
    billNumber,
    client: billData.clientId,
    createdBy: userId,
    service: billData.service,
    specifications: billData.specifications || [],
    lineItems,
    gstType,
    billingDate: billData.billingDate,
    renewalDate: billData.renewalDate,
    amount,
    status: isAdminDirect ? "approved" : "draft",
    adminDirectBill: isAdminDirect,
    ...(isAdminDirect && {
      approvedBy: userId,
      approvedAt: new Date(),
    }),
    parentBill: billData.parentBillId || undefined,
  });

  await bill.save();

  if (billData.parentBillId) {
    await Bill.findByIdAndUpdate(
      billData.parentBillId,
      {
        $set: {
          renewed: true,
          renewedAt: new Date(),
        },
      },
      { new: true },
    );
  }

  return bill.populate("client createdBy approvedBy correctionBy");
};

const getBills = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    service,
    startDate,
    endDate,
    renewalStartDate,
    renewalEndDate,
    renewalFilter, // 'today', 'this_week', 'this_month'
    billingDateFilter,
    billingStartDate,
    billingEndDate,
    salesPerson,
  } = query;
  const filter = {};

  if (user.role === ROLES.SALES) {
    filter.createdBy = user.id;
  } else if (salesPerson) {
    filter.createdBy = salesPerson;
  } else if (user.role === ROLES.ACCOUNTANT) {
    filter.status = { $in: ["pending_approval", "approved", "correction"] };
  }

  if (search) {
    const clientIds = await Client.find({
      $or: [
        { companyName: { $regex: search, $options: "i" } },
        { representativeName: { $regex: search, $options: "i" } },
      ],
    }).distinct("_id");

    filter.$or = [
      { billNumber: { $regex: search, $options: "i" } },
      { client: { $in: clientIds } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  if (service) {
    filter.service = service;
  }

  if (startDate || endDate) {
    filter.billingDate = {};
    if (startDate) filter.billingDate.$gte = new Date(startDate);
    if (endDate) filter.billingDate.$lte = new Date(endDate);
  }

  // Billing date filters (NEW)
  if (billingStartDate || billingEndDate) {
    filter.billingDate = filter.billingDate || {};
    if (billingStartDate) filter.billingDate.$gte = new Date(billingStartDate);
    if (billingEndDate) filter.billingDate.$lte = new Date(billingEndDate);
  } else if (billingDateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (billingDateFilter === "today") {
      filter.billingDate = {
        $gte: today,
        $lt: tomorrow,
      };
    } else if (billingDateFilter === "this_week") {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      filter.billingDate = {
        $gte: weekStart,
        $lt: weekEnd,
      };
    } else if (billingDateFilter === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      filter.billingDate = {
        $gte: monthStart,
        $lt: monthEnd,
      };
    }
  }

  // Renewal date filters
  if (renewalStartDate || renewalEndDate) {
    filter.renewalDate = {};
    if (renewalStartDate) filter.renewalDate.$gte = new Date(renewalStartDate);
    if (renewalEndDate) filter.renewalDate.$lte = new Date(renewalEndDate);
  } else if (renewalFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (renewalFilter === "today") {
      filter.renewalDate = {
        $gte: today,
        $lt: tomorrow,
      };
    } else if (renewalFilter === "this_week") {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      filter.renewalDate = {
        $gte: weekStart,
        $lt: weekEnd,
      };
    } else if (renewalFilter === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      filter.renewalDate = {
        $gte: monthStart,
        $lt: monthEnd,
      };
    }
  }

  const total = await Bill.countDocuments(filter);
  const bills = await Bill.find(filter)
    .populate("client")
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email")
    .populate("correctionBy", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const salesPersons = await User.find({ role: ROLES.SALES }, "name email");

  const allClientBillCounts = await Bill.aggregate([
    { $group: { _id: "$client", count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
  ]);
  const clientsWithMultipleBills = allClientBillCounts.map((c) =>
    c._id.toString(),
  );

  return {
    bills,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    salesPersons,
    clientsWithMultipleBills,
  };
};

const getBillById = async (id) => {
  const bill = await Bill.findById(id)
    .populate("client")
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email")
    .populate("correctionBy", "name email");

  if (!bill) {
    throw new Error("Bill not found");
  }
  return bill;
};

const updateBill = async (id, updateData, user) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    throw new Error("Bill not found");
  }

  if (user.role === ROLES.SALES) {
    if (bill.createdBy.toString() !== user.id) {
      throw new Error("Not authorized to update this bill");
    }
    if (!["draft", "correction"].includes(bill.status)) {
      throw new Error("Can only update bills in draft or correction status");
    }
  }

  const payload = { ...updateData };

  if (payload.clientId) {
    payload.client = payload.clientId;
    delete payload.clientId;
  }

  if (payload.lineItems) {
    payload.lineItems = normalizeLineItems(payload.lineItems);
    if (payload.lineItems.length === 0) {
      throw new Error("Add at least one item");
    }
    payload.amount = resolveTaxableAmount(payload, payload.lineItems);
  }

  if (payload.gstType && !["IGST", "CGST_SGST"].includes(payload.gstType)) {
    throw new Error("Invalid GST type");
  }

  if (payload.parentBillId !== undefined) {
    delete payload.parentBillId;
  }

  const updatedBill = await Bill.findByIdAndUpdate(id, payload, {
    new: true,
  }).populate("client createdBy approvedBy correctionBy");
  return updatedBill;
};

const deleteBill = async (id, user) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    throw new Error("Bill not found");
  }

  if (user.role === ROLES.SALES) {
    if (bill.createdBy.toString() !== user.id) {
      throw new Error("Not authorized to delete this bill");
    }
    if (bill.status !== "draft") {
      throw new Error("Can only delete draft bills");
    }
  }

  await Bill.findByIdAndDelete(id);
  return { message: "Bill deleted successfully" };
};

const submitBill = async (id, userId) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    throw new Error("Bill not found");
  }

  if (bill.createdBy.toString() !== userId) {
    throw new Error("Not authorized to submit this bill");
  }

  if (!["draft", "correction"].includes(bill.status)) {
    throw new Error("Only draft or correction bills can be submitted");
  }

  bill.status = "pending_approval";
  await bill.save();
  return bill.populate("client createdBy approvedBy correctionBy");
};

const approveBill = async (id, userId, billNumber) => {
  const bill = await Bill.findById(id);

  if (!bill) {
    throw new Error("Bill not found");
  }

  if (bill.status !== "pending_approval") {
    throw new Error("Only pending approval bills can be approved");
  }

  // if accountant changed invoice number
  if (
    billNumber &&
    billNumber.trim() !== "" &&
    bill.billNumber !== billNumber
  ) {
    const exists = await Bill.findOne({
      billNumber,
      _id: { $ne: id },
    });

    if (exists) {
      throw new Error("Invoice number already exists");
    }

    bill.billNumber = billNumber;
  }

  bill.status = "approved";
  bill.approvedBy = userId;
  bill.approvedAt = new Date();

  await bill.save();

  return bill.populate("client createdBy approvedBy correctionBy");
};

const sendForCorrection = async (id, userId, reason) => {
  const bill = await Bill.findById(id);
  if (!bill) {
    throw new Error("Bill not found");
  }

  if (bill.status !== "pending_approval") {
    throw new Error("Only pending approval bills can be sent for correction");
  }

  bill.status = "correction";
  bill.correctionBy = userId;
  bill.correctionAt = new Date();
  bill.correctionReason = reason;
  await bill.save();
  return bill.populate("client createdBy approvedBy correctionBy");
};

const sendBillEmailToClient = async (id, userId, invoiceType) => {
  const bill = await Bill.findById(id).populate("client");

  if (!bill) {
    throw new Error("Bill not found");
  }

  if (!bill.client?.email) {
    throw new Error("Client email not found");
  }

  let sendAsProforma;

  if (bill.adminDirectBill) {
    if (invoiceType === "proforma") {
      sendAsProforma = true;
    } else if (invoiceType === "tax") {
      sendAsProforma = false;
    } else {
      throw new Error(
        "Please specify invoice type: proforma or tax for admin bills.",
      );
    }
  } else if (bill.status === "draft") {
    sendAsProforma = true;
  } else if (bill.status === "approved") {
    sendAsProforma = false;
  } else {
    throw new Error("Only Draft or Approved invoices can be sent.");
  }

  if (sendAsProforma) {
    if (bill.proformaSentAt) {
      throw new Error("Proforma Invoice has already been sent.");
    }

    const pdfBuffer = await generatePdf(bill, bill.client, {
      forceProforma: true,
    });

    await sendBillEmail(bill, bill.client.email, pdfBuffer, {
      isProforma: true,
    });

    bill.proformaSentAt = new Date();
    bill.proformaSentBy = userId;

    await bill.save();

    return {
      message: "Proforma Invoice sent successfully.",
    };
  }

  if (bill.emailSentAt) {
    throw new Error("Invoice has already been sent.");
  }

  const pdfBuffer = await generatePdf(bill, bill.client, {
    forceProforma: false,
  });

  await sendBillEmail(bill, bill.client.email, pdfBuffer, {
    isProforma: false,
  });

  bill.emailSentAt = new Date();

  await bill.save();

  return {
    message: "Invoice sent successfully.",
  };
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
};
