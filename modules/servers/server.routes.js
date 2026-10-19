const express = require("express");
const router = express.Router();
const serverController = require("./server.controller");
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const { ROLES } = require("../../constants/roles");

router.use(auth);
router.use(authorize(ROLES.SUPERADMIN, ROLES.SERVER_ADMIN));

router.post("/", serverController.createServer);
router.get("/", serverController.getServers);
router.get("/:id", serverController.getServerById);
router.put("/:id", serverController.updateServer);
router.delete("/:id", serverController.deleteServer);
router.patch("/:id/toggle-status", serverController.toggleServerStatus);

module.exports = router;
