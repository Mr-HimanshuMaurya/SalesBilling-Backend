const express = require("express");
const router = express.Router();
const lostController = require("./lost.controller");
const { auth } = require("../../middleware/auth.middleware");

router.use(auth);

router.post("/:billId/mark", lostController.markAsLost);

router.get("/", lostController.getLostClients);

module.exports = router;
