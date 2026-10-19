const User = require("./user.model");
const { ROLES } = require("../../constants/roles");

// Get user schedule
const getUserSchedule = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== ROLES.SUPERADMIN && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this user's schedule",
      });
    }

    const user = await User.findById(userId).select(
      "schedule restrictOutsideHours name email role",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        schedule: user.schedule || [],
        restrictOutsideHours:
          user.restrictOutsideHours !== undefined
            ? user.restrictOutsideHours
            : true,
      },
    });
  } catch (error) {
    console.error("Error getting user schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user schedule
const updateUserSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    const { schedule, restrictOutsideHours } = req.body;

    if (req.user.role !== ROLES.SUPERADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only superadmin can update user schedule",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Validate schedule if provided
    if (schedule) {
      const daysOfWeek = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

      for (const day of schedule) {
        if (!daysOfWeek.includes(day.day)) {
          return res.status(400).json({
            success: false,
            message: `Invalid day: ${day.day}`,
          });
        }

        if (!timeRegex.test(day.startTime) || !timeRegex.test(day.endTime)) {
          return res.status(400).json({
            success: false,
            message: `Invalid time format for ${day.day}. Use HH:mm`,
          });
        }
      }

      user.schedule = schedule;
    }

    if (restrictOutsideHours !== undefined) {
      user.restrictOutsideHours = restrictOutsideHours;
    }

    await user.save();

    res.json({
      success: true,
      message: "Schedule updated successfully",
      data: {
        schedule: user.schedule,
        restrictOutsideHours: user.restrictOutsideHours,
      },
    });
  } catch (error) {
    console.error("Error updating user schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//  Only check office hours (MAC check removed)
const canUserLogin = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { allowed: false, reason: "User not found" };
    }

    if (!user.isActive) {
      return { allowed: false, reason: "User account is inactive" };
    }

    // Only enforce for Sales and Accountant
    if (user.role !== ROLES.SALES && user.role !== ROLES.ACCOUNTANT) {
      return { allowed: true };
    }

    // Check office hours
    if (user.restrictOutsideHours) {
      //  Get current time in IST (UTC + 5:30)
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
      const istTime = new Date(now.getTime() + istOffset);

      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayOfWeek = days[istTime.getUTCDay()];

      const todaySchedule = user.schedule.find((s) => s.day === dayOfWeek);

      if (!todaySchedule || !todaySchedule.isActive) {
        return {
          allowed: false,
          reason: "Today is not a working day",
          code: "NON_WORKING_DAY",
        };
      }

      //  Calculate current time in minutes (IST)
      const currentMinutes =
        istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

      const [startHour, startMinute] = todaySchedule.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = todaySchedule.endTime.split(":").map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (currentMinutes < startTime || currentMinutes > endTime) {
        return {
          allowed: false,
          reason: `Office hours are ${todaySchedule.startTime} to ${todaySchedule.endTime} IST`,
          code: "OUTSIDE_OFFICE_HOURS",
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking login permission:", error);
    return { allowed: false, reason: "Internal server error" };
  }
};

module.exports = {
  getUserSchedule,
  updateUserSchedule,
  canUserLogin,
};
