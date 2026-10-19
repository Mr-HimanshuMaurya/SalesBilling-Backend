const mongoose = require("mongoose");
const User = require("../modules/users/user.model");
require("dotenv").config();

const migrate = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://datacloude8_db_user:HCwUq3jCIRuKfApE@ac-xxt2tdv-shard-00-00.wnrbuj0.mongodb.net:27017,ac-xxt2tdv-shard-00-01.wnrbuj0.mongodb.net:27017,ac-xxt2tdv-shard-00-02.wnrbuj0.mongodb.net:27017/?ssl=true&replicaSet=atlas-vqukar-shard-0&authSource=admin&appName=Sales-Billing",
    );
    console.log("Connected to MongoDB");

    const defaultSchedule = [
      { day: "monday", startTime: "10:00", endTime: "19:00", isActive: true },
      { day: "tuesday", startTime: "10:00", endTime: "19:00", isActive: true },
      {
        day: "wednesday",
        startTime: "10:00",
        endTime: "19:00",
        isActive: true,
      },
      { day: "thursday", startTime: "10:00", endTime: "19:00", isActive: true },
      { day: "friday", startTime: "10:00", endTime: "19:00", isActive: true },
      { day: "saturday", startTime: "10:00", endTime: "19:00", isActive: true },
      { day: "sunday", startTime: "10:00", endTime: "19:00", isActive: false },
    ];

    const result = await User.updateMany(
      { schedule: { $exists: false } },
      {
        $set: {
          schedule: defaultSchedule,
          restrictOutsideHours: true,
        },
        // Remove MAC fields if they exist
        $unset: {
          macAddresses: "",
          allowedDevices: "",
        },
      },
    );

    console.log(` Migration complete. Updated ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error(" Migration failed:", error);
    process.exit(1);
  }
};

migrate();
