const Bill = require("../bills/bill.model");
const { generateTallyXML } = require("../../utils/tallyXml");
const { successResponse, errorResponse } = require("../../utils/apiResponse");

const AGENT_KEY = process.env.TALLY_AGENT_KEY || "tally_agent_secret_2025";

// ── Middleware: validate bridge agent API key
const validateAgentKey = (req, res, next) => {
  const key = req.headers["x-tally-agent-key"] || req.query.agentKey;
  if (!key || key !== AGENT_KEY) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid agent key" });
  }
  next();
};

// ── 1. Accountant clicks "Push to Tally"
const pushToTally = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId).populate("client");
    if (!bill) return errorResponse(res, "Bill not found", 404);

    if (bill.status !== "approved") {
      return errorResponse(
        res,
        "Only approved bills can be pushed to Tally",
        400,
      );
    }
    if (bill.tallyStatus === "pushed") {
      return errorResponse(res, "Bill already pushed to Tally", 400);
    }

    bill.tallyStatus = "pending";
    bill.tallyPushedAt = new Date();
    bill.tallyError = null;
    await bill.save();

    return successResponse(
      res,
      { tallyStatus: bill.tallyStatus },
      "Bill queued for Tally push",
    );
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// ── 2. Bridge agent polls for pending bills
const getPendingBills = [
  validateAgentKey,
  async (req, res) => {
    try {
      const bills = await Bill.find({ tallyStatus: "pending" })
        .populate("client")
        .lean();

      const result = bills.map((bill) => ({
        _id: bill._id,
        billNumber: bill.billNumber,
        service: bill.service,
        amount: bill.amount,
        billingDate: bill.billingDate,
        renewalDate: bill.renewalDate,
        specifications: bill.specifications,
        client: {
          companyName: bill.client?.companyName,
          representativeName: bill.client?.representativeName,
          phone: bill.client?.phone,
          email: bill.client?.email,
          gstNumber: bill.client?.gstNumber,
          address: bill.client?.address,
          state: bill.client?.state,
        },
        tallyXML: generateTallyXML(bill, bill.client),
      }));

      return successResponse(res, result, `${result.length} bills pending`);
    } catch (err) {
      return errorResponse(res, err.message);
    }
  },
];

// ── 3. Bridge agent confirms result
const confirmTallyPush = [
  validateAgentKey,
  async (req, res) => {
    try {
      const { success, error, voucherId } = req.body;
      const bill = await Bill.findById(req.params.billId);
      if (!bill) return errorResponse(res, "Bill not found", 404);

      if (success) {
        bill.tallyStatus = "pushed";
        bill.tallyConfirmedAt = new Date();
        bill.tallyVoucherId = voucherId || "";
        bill.tallyError = null;
      } else {
        bill.tallyStatus = "failed";
        bill.tallyError = error || "Unknown error";
      }

      await bill.save();
      return successResponse(
        res,
        { tallyStatus: bill.tallyStatus },
        "Tally status updated",
      );
    } catch (err) {
      return errorResponse(res, err.message);
    }
  },
];

// ── 4. Get tally status
const getTallyStatus = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId).select(
      "billNumber tallyStatus tallyPushedAt tallyConfirmedAt tallyError tallyVoucherId",
    );
    if (!bill) return errorResponse(res, "Bill not found", 404);
    return successResponse(res, bill);
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

module.exports = {
  pushToTally,
  getPendingBills,
  confirmTallyPush,
  getTallyStatus,
};
