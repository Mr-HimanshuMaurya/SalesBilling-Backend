const express = require("express");
const router = express.Router();
const billController = require("./bill.controller");
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const { ROLES } = require("../../constants/roles");
const {
  getRevenueStats,
  getRevenueByMonth,
} = require("./bill.revenue.controller");

router.use(auth);

router.post(
  "/",
  authorize(ROLES.SALES, ROLES.SUPERADMIN),
  billController.createBill,
);
router.get("/", billController.getBills);
router.get("/:id", billController.getBillById);
router.put("/:id", billController.updateBill);
router.delete(
  "/:id",
  authorize(ROLES.SALES, ROLES.SUPERADMIN),
  billController.deleteBill,
);
router.post(
  "/:id/submit",
  authorize(ROLES.SALES, ROLES.SUPERADMIN),
  billController.submitBill,
);
router.post(
  "/:id/approve",
  authorize(ROLES.ACCOUNTANT),
  billController.approveBill,
);
router.post(
  "/:id/send-for-correction",
  authorize(ROLES.ACCOUNTANT),
  billController.sendForCorrection,
);

router.post(
  "/:id/tally-push",
  authorize(ROLES.ACCOUNTANT),
  billController.approveBill,
);

router.post(
  "/:id/send-email",
  authorize(ROLES.SALES, ROLES.ACCOUNTANT, ROLES.SUPERADMIN),
  billController.sendBillEmailToClient,
);

router.patch(
  "/:id/stop-alerts",

  billController.stopRenewalAlerts,
);

// Get renewal alert status
router.get("/:id/alert-status", billController.getRenewalAlertStatus);

router.get(
  "/revenue/stats",

  getRevenueStats,
);

router.get(
  "/revenue/by-month",

  getRevenueByMonth,
);

router.get("/export/excel", billController.exportBillsExcel);

module.exports = router;
