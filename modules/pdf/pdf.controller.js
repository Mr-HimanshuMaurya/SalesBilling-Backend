const pdfService = require("./pdf.service");
const { errorResponse, successResponse } = require("../../utils/apiResponse");


const downloadPdf = async (req, res) => {
  try {
    const invoiceType = req.query.type;
    const { pdfBuffer, bill, invoiceType: resolvedType } =
      await pdfService.downloadPdf(req.params.billId, invoiceType);

    const buffer = Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer);

    const isProforma =
      resolvedType === "proforma" ||
      (!resolvedType && bill.status === "draft");
    const filename = isProforma
      ? `Proforma-${bill.billNumber}.pdf`
      : `${bill.billNumber}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (error) {
    console.error(" PDF error:", error);
    return errorResponse(res, error.message);
  }
};


const downloadAndSendPdf = async (req, res) => {
  try {
    const { billId } = req.params;
    const { email } = req.body; 

    let result;

    if (email) {
      // Send to custom email
      result = await pdfService.sendPdfToEmail(billId, email);
    } else {
      // Send to client's email from database
      result = await pdfService.downloadAndSendPdf(billId);
    }

    return successResponse(res, "Invoice PDF sent successfully", {
      billNumber: result.bill.billNumber,
      clientEmail: result.bill.client?.email || email,
      emailId: result.emailResult?.messageId,
      pdfSize: `${(result.pdfBuffer.length / 1024).toFixed(2)} KB`,
    });
  } catch (error) {
    console.error(" Error sending PDF:", error);
    return errorResponse(res, error.message);
  }
};


const sendPdfToEmail = async (req, res) => {
  try {
    const { billId } = req.params;
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, "Email is required");
    }

    const result = await pdfService.sendPdfToEmail(billId, email);

    return successResponse(res, "Invoice PDF sent successfully", {
      billNumber: result.bill.billNumber,
      sentTo: email,
      emailId: result.emailResult?.messageId,
      pdfSize: `${(result.pdfBuffer.length / 1024).toFixed(2)} KB`,
    });
  } catch (error) {
    console.error(" Error sending PDF:", error);
    return errorResponse(res, error.message);
  }
};

module.exports = {
  downloadPdf,
  downloadAndSendPdf,
  sendPdfToEmail,
};
