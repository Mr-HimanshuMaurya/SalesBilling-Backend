const express = require("express");
const router = express.Router();
const pdfController = require("./pdf.controller");

// Download PDF only
router.get("/:billId", pdfController.downloadPdf);

// NEW: Download and send PDF via email (to client's email)
router.post("/:billId/send", pdfController.downloadAndSendPdf);

// NEW: Send PDF to custom email
router.post("/:billId/send-to", pdfController.sendPdfToEmail);

module.exports = router;
