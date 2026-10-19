const express = require("express");
const router = express.Router();
const clientController = require("./client.controller");
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const { ROLES } = require("../../constants/roles");

router.use(auth);

router.get(
  "/without-bills",

  clientController.getClientsWithoutBills,
);

router.get(
  "/:id/bill-status",

  authorize(ROLES.SUPERADMIN, ROLES.ACCOUNTANT, ROLES.SALES),
  clientController.getClientBillStatus,
);

router.post(
  "/",
  authorize(ROLES.SALES, ROLES.SUPERADMIN),
  clientController.createClient,
);
router.get("/", clientController.getClients);
router.get("/:id", clientController.getClientById);
router.put("/:id", clientController.updateClient);
router.delete(
  "/:id",
  authorize(ROLES.SUPERADMIN),
  clientController.deleteClient,
);

module.exports = router;
