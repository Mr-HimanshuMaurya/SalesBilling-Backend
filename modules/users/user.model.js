const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../../constants/roles");

const defaultSchedule = [
  { day: "monday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "tuesday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "wednesday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "thursday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "friday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "saturday", startTime: "10:00", endTime: "19:00", isActive: true },
  { day: "sunday", startTime: "10:00", endTime: "19:00", isActive: false },
];

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  schedule: {
    type: [
      {
        day: {
          type: String,
          enum: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ],
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    default: defaultSchedule,
  },

  restrictOutsideHours: {
    type: Boolean,
    default: true,
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    return ret;
  },
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model("User", userSchema);
