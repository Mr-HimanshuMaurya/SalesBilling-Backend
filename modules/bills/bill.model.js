const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: String,
      enum: ["Printer"],
      required: true,
    },
    specifications: [
      {
        key: String,
        value: String,
      },
    ],
    lineItems: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        rate: { type: Number, required: true, default: 0 },
        amount: { type: Number, required: true, default: 0 },
      },
    ],
    gstType: {
      type: String,
      enum: ["IGST", "CGST_SGST", "NO_GST"],
      default: "IGST",
    },
    billingDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "correction"],
      default: "draft",
    },
    adminDirectBill: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: [String], // Array to track which reminders were sent
      default: []
    },
    renewalAlertsStopped: {
      type: Boolean,
      default: false
    },
    renewalAlertsStoppedAt: {
      type: Date
    },
    clientRenewed: {
      type: Boolean,
      default: false
    },
    clientRenewedAt: {
      type: Date
    },
    renewed: {
      type: Boolean,
      default: false
    },
    renewedAt: {
      type: Date
    },
    parentBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill"
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    correctionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    correctionAt: {
      type: Date,
    },
    correctionReason: {
      type: String,
    },
    emailSentAt: {
      type: Date,
    },
    proformaSentAt: {
      type: Date,
    },

    proformaSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tallyStatus: {
      type: String,
      enum: ["not_pushed", "pending", "pushed", "failed"],
      default: "not_pushed",
    },
    tallyPushedAt: Date,
    tallyConfirmedAt: { type: Date },
    tallyError: { type: String },
    tallyVoucherId: { type: String },
    isLost: { type: Boolean, default: false },
    lostReason: { type: String, default: '' },
    lostMarkedAt: { type: Date },
    lostMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

billSchema.index({
  renewalDate: 1,
  status: 1,
  createdBy: 1,
});

module.exports = mongoose.model("Bill", billSchema);
