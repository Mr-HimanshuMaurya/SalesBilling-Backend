const mongoose = require("mongoose");

const serverAssignmentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true,
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
  },
  serverType: {
    type: String,
    enum: ["dedicated", "shared"],
    required: true,
  },
  // For shared servers
  sharedUsers: {
    type: Number,
    default: 0,
  },
  sharedUserDetails: {
    type: [
      {
        username: String,
        email: String,
        role: String,
      },
    ],
    default: [],
  },
  // Configuration details
  configuration: {
    cpu: {
      type: String,
    },
    ram: {
      type: String,
    },
    storage: {
      type: String,
    },
    bandwidth: {
      type: String,
    },
    database: {
      type: String,
    },
    phpVersion: {
      type: String,
    },
    nodeVersion: {
      type: String,
    },
    otherDetails: {
      type: String,
    },
  },
  // Windows specific
  windowsKey: {
    type: String,
  },
  windowsKeyLastDigits: {
    type: String,
  },
  // Validity
  validityStart: {
    type: Date,
  },
  validityEnd: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["active", "expired", "pending", "suspended"],
    default: "active",
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
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

serverAssignmentSchema.pre("save", async function () {
  this.updatedAt = new Date();
});

// Index for faster queries
serverAssignmentSchema.index({ client: 1, server: 1 });
serverAssignmentSchema.index({ status: 1 });
serverAssignmentSchema.index({ validityEnd: 1 });

module.exports = mongoose.model("ServerAssignment", serverAssignmentSchema);
