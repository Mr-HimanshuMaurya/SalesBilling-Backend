// backend/scripts/addServerAdminRole.js
const mongoose = require("mongoose");
const User = require("../modules/users/user.model");
require("dotenv").config();

const migrate = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb://datacloude8_db_user:5LcoVI6iqGHKsozW@ac-3jkv1xm-shard-00-00.g7kib4z.mongodb.net:27017,ac-3jkv1xm-shard-00-01.g7kib4z.mongodb.net:27017,ac-3jkv1xm-shard-00-02.g7kib4z.mongodb.net:27017/?ssl=true&replicaSet=atlas-6ppv9n-shard-0&authSource=admin&appName=Cluster0",
    );
    console.log("Connected to MongoDB");

    // Create a Server Admin user (optional)
    const serverAdmin = await User.findOne({ role: "server_admin" });
    if (!serverAdmin) {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("ServerAdmin@123", 10);

      await User.create({
        name: "Server Administrator",
        email: "serveradmin@cloudedata.com",
        password: hashedPassword,
        role: "server_admin",
        isActive: true,
      });
      console.log(" Server Admin user created");
    }

    console.log(" Migration complete");
    process.exit(0);
  } catch (error) {
    console.error(" Migration failed:", error);
    process.exit(1);
  }
};

migrate();
