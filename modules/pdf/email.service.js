const axios = require("axios");
const fs = require("fs");
const path = require("path");

const sendBillEmail = async (bill, clientEmail, pdfBuffer) => {
  try {
    if (!bill) throw new Error("Bill object is required");
    if (!clientEmail) throw new Error("Client email is required");
    if (!pdfBuffer) throw new Error("PDF buffer is required");

    // Save PDF temporarily
    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfPath = path.join(tempDir, `${bill.billNumber}.pdf`);

    // Write PDF to file
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else {
      buffer = Buffer.from(pdfBuffer);
    }

    fs.writeFileSync(pdfPath, buffer);
    console.log(` PDF saved temporarily: ${pdfPath}`);
    console.log(` PDF size: ${buffer.length} bytes`);

    // Read the PDF file and convert to base64
    const pdfData = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfData.toString("base64");

    const subject = `Invoice ${bill.billNumber}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Invoice ${bill.billNumber}</h2>
            <p>Dear ${bill.client?.representativeName || "Customer"},</p>
            <p>Please find attached invoice <strong>${bill.billNumber}</strong> for your reference.</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Invoice Number:</strong> ${bill.billNumber}</p>
              <p><strong>Billing Date:</strong> ${new Date(bill.billingDate).toLocaleDateString()}</p>
              <p><strong>Amount:</strong> ₹${bill.amount}</p>
            </div>
            <p>Regards,<br>
            <strong>${process.env.FROM_NAME || "Aastha Enterprises"}</strong></p>
          </div>
        </body>
      </html>
    `;

    const payload = {
      sender: {
        name: process.env.FROM_NAME || "Aastha Enterprises",
        email: process.env.FROM_EMAIL || "support@aastha.com",
      },
      to: [{ email: clientEmail }],
      subject,
      htmlContent,
      attachment: [
        // Note: Using 'attachment' (singular) for Brevo
        {
          content: pdfBase64,
          name: `${bill.billNumber}.pdf`,
          type: "application/pdf",
        },
      ],
    };

    console.log(" Sending email with PDF attachment...");
    console.log(` Base64 length: ${pdfBase64.length}`);

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    // Clean up temp file
    try {
      fs.unlinkSync(pdfPath);
      console.log(" Temp file cleaned up");
    } catch (err) {
      console.log("Could not delete temp file:", err.message);
    }

    console.log("Email sent successfully:", response.data.messageId);
    return response.data;
  } catch (error) {
    console.error(" Error sending email:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
};

module.exports = { sendBillEmail };
