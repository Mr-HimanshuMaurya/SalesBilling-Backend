const mongoose = require("mongoose");
const billModel = require("../modules/bills/bill.model");

require("dotenv").config();

const migrate = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://datacloude8_db_user:HCwUq3jCIRuKfApE@ac-xxt2tdv-shard-00-00.wnrbuj0.mongodb.net:27017,ac-xxt2tdv-shard-00-01.wnrbuj0.mongodb.net:27017,ac-xxt2tdv-shard-00-02.wnrbuj0.mongodb.net:27017/?ssl=true&replicaSet=atlas-vqukar-shard-0&authSource=admin&appName=Sales-Billing",
    );
    console.log("Connected to MongoDB");

    const result = await billModel.updateMany(
      { reminderSent: { $exists: false } },
      {
        $set: {
          reminderSent: [],
          renewalAlertsStopped: false,
          clientRenewed: false,
        },
      },
    );

    console.log(` Migration complete. Updated ${result.modifiedCount} bills`);
    process.exit(0);
  } catch (error) {
    console.error(" Migration failed:", error);
    process.exit(1);
  }
};

migrate();
