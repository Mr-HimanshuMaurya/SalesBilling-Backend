const express = require("express");
const router = express.Router();
const ctrl = require("./tally.controller");
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");

// Accountant/SuperAdmin — mark bill as tally pending
router.post(
  "/:billId/push",
  auth,
  authorize("accountant", "superadmin"),
  ctrl.pushToTally,
);

// Bridge Agent — poll pending bills (API key auth, no JWT needed)
router.get("/pending", ctrl.getPendingBills);

// Bridge Agent — confirm push result (success or fail)
router.post("/:billId/confirm", ctrl.confirmTallyPush);

// Get tally status of a bill
router.get("/:billId/status", auth, ctrl.getTallyStatus);

module.exports = router;
