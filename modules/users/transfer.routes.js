const express = require("express");
const router = express.Router();
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const { ROLES } = require("../../constants/roles");
const transferController = require("./transfer.controller");

router.use(auth);
router.use(authorize(ROLES.SUPERADMIN));

router.get(
  "/:fromUserId/transfer-preview",
  transferController.getTransferPreview,
);
router.post("/:fromUserId/transfer", transferController.transferUserData);
module.exports = router;
