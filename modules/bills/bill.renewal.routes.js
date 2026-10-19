const express = require("express");
const router = express.Router();
const { authenticate, auth } = require("../../middleware/auth.middleware");

const { ROLES } = require("../../constants/roles");
const {
  getSalesUpcomingRenewals,
  getAllUpcomingRenewals,
  getRenewalStats,
} = require("./bill.renewal.controller");
const { authorize } = require("../../middleware/role.middleware");
router.use(auth);

router.get(
  "/sales/upcoming",

 
  getSalesUpcomingRenewals,
);

// Superadmin & Accountant - Get all upcoming renewals
router.get(
  "/all/upcoming",


  getAllUpcomingRenewals,
);

// Get renewal stats (for dashboard)
router.get(
  "/stats",
  
  getRenewalStats,
);

module.exports = router;
