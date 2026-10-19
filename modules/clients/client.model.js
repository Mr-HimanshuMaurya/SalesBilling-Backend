const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    representativeName: {
      type: String,
      // required: true,
    },
    companyName: {
      type: String,
    },
    phone: {
      type: String,
      // required: true,
    },
    address: {
      type: String,
    },
    email: {
      type: String,
      // required: true,
      lowercase: true,
    },
    gstNumber: {
      type: String,
    },
    salesRepName: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Client", clientSchema);
