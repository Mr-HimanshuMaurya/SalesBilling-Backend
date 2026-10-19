const cron = require("node-cron");
const Bill = require("../modules/bills/bill.model");
const { sendRenewalReminder } = require("../utils/email");

// Function to check and send renewal reminders
const checkAndSendRenewalReminders = async () => {
  try {
    console.log(" Running renewal reminder check...", new Date().toISOString());

    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Get bills that need reminders
    const bills = await Bill.find({
      status: "approved",
      renewalAlertsStopped: false,
      renewalDate: {
        $gte: today,
        $lte: sevenDaysFromNow,
      },
    }).populate("client");

    console.log(` Found ${bills.length} bills needing reminders`);

    for (const bill of bills) {
      const daysLeft = Math.ceil(
        (new Date(bill.renewalDate) - today) / (1000 * 60 * 60 * 24),
      );

      // Check if reminder already sent for this day
      const reminderKey = `${daysLeft}day`;

      if (bill.reminderSent && bill.reminderSent.includes(reminderKey)) {
        console.log(
          `Reminder already sent for ${bill.billNumber} - ${daysLeft} days left`,
        );
        continue;
      }

      // Send reminder for 7, 6, 5 days (or any days you want)
      if (daysLeft <= 7 && daysLeft >= 1) {
        try {
          await sendRenewalReminder(bill, bill.client, daysLeft);

          // Update bill with reminder tracking
          bill.reminderSent = bill.reminderSent || [];
          bill.reminderSent.push(reminderKey);
          await bill.save();

          console.log(
            ` Reminder sent for ${bill.billNumber} - ${daysLeft} days left`,
          );
        } catch (error) {
          console.error(
            `Failed to send reminder for ${bill.billNumber}:`,
            error.message,
          );
        }
      }

      // Mark as stopped if renewal date passed
      if (daysLeft < 0) {
        bill.renewalAlertsStopped = true;
        bill.renewalAlertsStoppedAt = new Date();
        await bill.save();
        console.log(
          ` Alerts stopped for ${bill.billNumber} - Renewal date passed`,
        );
      }
    }

    console.log(" Renewal reminder check completed");
  } catch (error) {
    console.error(" Error in renewal reminder job:", error);
  }
};

// Schedule cron job - Runs every day at 9:00 AM
const startRenewalReminderJob = () => {
  // Run at 2:15 PM every day
  cron.schedule(
    "16 14 * * *",
    async () => {
      console.log("Running scheduled renewal reminder check...");
      await checkAndSendRenewalReminders();
    },
    {
      timezone: "Asia/Kolkata", // Recommended
    },
  );

  console.log("Renewal reminder job scheduled for 2:15 PM daily");
};

const triggerReminderCheck = async () => {
  await checkAndSendRenewalReminders();
};

module.exports = {
  startRenewalReminderJob,
  triggerReminderCheck,
  checkAndSendRenewalReminders,
};
