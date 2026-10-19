const mongoose = require("mongoose");

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  port: {
    type: Number,
    default: 22,
  },
  osType: {
    type: String,
    enum: ["windows", "linux", "ubuntu", "centos", "other"],
    required: true,
  },
  osVersion: {
    type: String,
  },
  specs: {
    cpu: {
      type: String,
      required: true,
    },
    ram: {
      type: String,
      required: true,
    },
    storage: {
      type: String,
      required: true,
    },
    bandwidth: {
      type: String,
    },
  },
  location: {
    type: String,
  },
  provider: {
    type: String,
    enum: ["cloudedata", "other"],
  },
  status: {
    type: String,
    enum: ["active", "maintenance", "inactive", "pending"],
    default: "active",
  },
  isDedicated: {
    type: Boolean,
    default: false,
  },
  totalClients: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

serverSchema.pre("save", async function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model("Server", serverSchema);
