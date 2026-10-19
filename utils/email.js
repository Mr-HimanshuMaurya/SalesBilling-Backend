const axios = require("axios");
const { getRenewalReminderEmail } = require("./emailTemplates");

const sendEmail = async (to, subject, htmlContent, attachment = []) => {
  try {
    // Validate inputs
    if (!to) throw new Error("Recipient email is required");
    if (!subject) throw new Error("Subject is required");
    if (!htmlContent) throw new Error("HTML content is required");

    const payload = {
      sender: {
        name: process.env.FROM_NAME || "Aastha Enterprises",
        email: process.env.FROM_EMAIL || "support@aastha.com",
      },
      to: Array.isArray(to) ? to.map((email) => ({ email })) : [{ email: to }],
      subject,
      htmlContent,
      attachment: attachment || [],
    };

    console.log(`Sending email to: ${to}, Subject: ${subject}`);
    console.log(`Attachment count: ${attachment.length}`);

    if (attachment.length > 0) {
      attachment.forEach((att, index) => {
        console.log(
          `Attachment ${index + 1}: ${att.name}, Size: ${(att.content.length / 1024).toFixed(2)} KB`,
        );
      });
    }

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    console.log("Email sent successfully:", response.data.messageId);
    return response.data;
  } catch (error) {
    console.error("Error sending email via Brevo:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

const sendBillEmail = async (bill, clientEmail, pdfBuffer, emailOptions = {}) => {
  try {
    // Validate inputs
    if (!bill) throw new Error("Bill object is required");
    if (!clientEmail) throw new Error("Client email is required");
    if (!pdfBuffer) throw new Error("PDF buffer is required");
    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error("pdfBuffer must be a Buffer");
    }

    if (pdfBuffer.length === 0) {
      throw new Error("PDF buffer is empty");
    }
    const isProforma =
      emailOptions.isProforma !== undefined
        ? emailOptions.isProforma
        : bill.status === "draft";

    const subject = isProforma
      ? "Proforma-Invoice"
      : `invoice ${bill?.billNumber}`;

    // Beautiful HTML email with sky blue theme and Lucide icons
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${isProforma ? "Proforma Invoice" : "Tax Invoice"} ${bill.billNumber || ""}</title>
          <!-- Lucide React Icons (using feather icons for email compatibility) -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: linear-gradient(135deg, #e8f4f8 0%, #b8dce8 100%);
              min-height: 100vh;
              padding: 40px 20px;
              margin: 0;
            }
            
            .email-wrapper {
              max-width: 620px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              animation: slideUp 0.5s ease-out;
            }
            
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            /* Header with Sky Blue Gradient */
            .email-header {
              background: linear-gradient(135deg, #4A90D9 0%, #6BB8E8 50%, #87CEEB 100%);
              padding: 40px 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .email-header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -20%;
              width: 80%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              transform: rotate(15deg);
            }
            
            .header-content {
              position: relative;
              z-index: 1;
            }
            
            .company-logo {
              width: 150px;
              height: 150px;
              margin: 0 auto 15px;
              
              padding: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
             
            }
            
            .company-logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            
            .company-name {
              color: #ffffff;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: -0.5px;
              margin-bottom: 5px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .company-tagline {
              color: rgba(255, 255, 255, 0.9);
              font-size: 14px;
              font-weight: 300;
              letter-spacing: 0.5px;
            }
            
            /* Body Content */
            .email-body {
              padding: 40px 40px 30px;
              background: #ffffff;
            }
            
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a2e;
              margin-bottom: 8px;
            }
            
            .greeting span {
              color: #4A90D9;
            }
            
            .message-text {
              color: #4a4a6a;
              font-size: 15px;
              line-height: 1.7;
              margin-bottom: 25px;
            }
            
            /* Invoice Details Card */
.invoice-card {
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f2f8 100%);
  border-radius: 16px;
  padding: 25px 30px;
  margin: 25px 0 30px;
  border: 1px solid rgba(74, 144, 217, 0.15);
  box-shadow: 0 2px 10px rgba(74, 144, 217, 0.05);
}

.invoice-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #4A90D9;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(74, 144, 217, 0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}

.invoice-card-title i {
  font-size: 16px;
  color: #4A90D9;
}

.invoice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 30px;
}

.invoice-item {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.invoice-item .label {
  font-size: 13px;  /* Same as value */
  font-weight: 600;
  color: #7a7a9a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.invoice-item .label i {
  font-size: 13px;  /* Same as label */
  color: #4A90D9;
  width: 16px;
}

.invoice-item .value {
  font-size: 13px;  /* Same as label */
  font-weight: 600;
  color: #1a1a2e;
  padding-left: 22px;  /* Align with icon width */
}

.invoice-item .value.amount {
  color: #4A90D9;
  font-size: 18px;  /* Slightly larger for amount to stand out */
  font-weight: 700;
}

.invoice-divider {
  grid-column: 1 / -1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(74, 144, 217, 0.2), transparent);
  margin: 8px 0 12px 0;
}

.invoice-thankyou {
  grid-column: 1 / -1;
  text-align: center;
  padding: 10px 0 0 0;
}

.invoice-thankyou span {
  font-size: 13px;  /* Same as label and value */
  font-weight: 500;
  color: #4A90D9;
  letter-spacing: 0.5px;
}

.email-footer {
              background: #f8fbfd;
              padding: 25px 40px;
              text-align: center;
              border-top: 1px solid #eef2f7;
            }
            
            .email-footer p {
              font-size: 12px;
              color: #9a9aba;
              line-height: 1.6;
              margin: 0;
            }
            
            .email-footer .footer-icons {
              margin: 8px 0;
            }
            
            .email-footer .footer-icons i {
              font-size: 18px;
              color: #4A90D9;
              margin: 0 8px;
              opacity: 0.6;
              transition: opacity 0.3s ease;
            }
            
            .email-footer .footer-icons i:hover {
              opacity: 1;
            }

  .email-footer .disclaimer {
              font-size: 11px;
              color: #b0b0ca;
              margin-top: 10px;
            }

/* Responsive */
@media (max-width: 600px) {
  .invoice-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .invoice-item .value {
    padding-left: 0;
  }
  
  .invoice-item .label {
    font-size: 12px;
  }
  
  .invoice-item .value {
    font-size: 12px;
  }
  
  .invoice-item .value.amount {
    font-size: 16px;
  }
  
  .invoice-thankyou span {
    font-size: 12px;
  }
}
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <!-- Header with Sky Blue Gradient -->
           <div>
            <div style="background:linear-gradient(135deg,#93d6f5 0%,#b0e1f7 60%,#b0d8eb 100%);padding:36px 40px 28px;text-align:center;">
              <img src="/aasthalogo.png" alt="Aastha" width="160" style="display:block;margin:0 auto 16px;" onerror="this.style.display='none'"/>
            </div>
          </div>
            
            <!-- Body -->
            <div class="email-body">
              <div class="greeting">
                <i class="fas fa-user" style="color: #4A90D9; margin-right: 8px;"></i>
                Dear <span>${bill.client?.representativeName || "Customer"}</span>,
              </div>
              
              <p class="message-text">
                <i class="fas fa-file-invoice" style="color: #4A90D9; margin-right: 8px;"></i>
               ${
                 isProforma
                   ? `
      Please find attached the <strong>Proforma Invoice</strong> for your review.
      This document is issued for quotation and payment purposes only. It is not a Tax Invoice.
    `
                   : `
      Please find attached <strong>Tax Invoice ${bill.billNumber}</strong> for your reference.
      We appreciate your business and trust in our services.
    `
               }
              </p>
              
              <!-- Invoice Details Card -->
             
              <div class="invoice-card">
  <div class="invoice-card-title">
    <i class="fas fa-receipt"></i>
${isProforma ? "PROFORMA INVOICE DETAILS" : "TAX INVOICE DETAILS"}
  </div>
  <div class="invoice-grid">
    <!-- Row 1: Invoice Number -->
    <div class="invoice-item">
      <span class="label"><i class="fas fa-hashtag"></i> INVOICE NUMBER</span>
      <span class="value">
  ${isProforma ? "Proforma Invoice" : bill.billNumber}
</span>
    </div>
    
    <!-- Row 2: Billing Date -->
    <div class="invoice-item">
      <span class="label"><i class="fas fa-calendar"></i> BILLING DATE</span>
      <span class="value">${new Date(bill.billingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
    </div>
    
    <!-- Row 3: Service -->
    <div class="invoice-item">
      <span class="label"><i class="fas fa-tag"></i> SERVICE</span>
      <span class="value">${bill.service || "N/A"}</span>
    </div>
    
    <!-- Row 4: Amount -->
    <div class="invoice-item">
      <span class="label"><i class="fas fa-rupee-sign"></i> AMOUNT</span>
      <span class="value amount">₹${bill.amount}</span>
    </div>
    
    <!-- Divider -->
    <div class="invoice-divider"></div>
    
    <!-- Thank You Message -->
   <div class="invoice-thankyou">
  <span>Thank you for choosing Aastha Enterprises</span>
 
</div>
  </div>
</div>
              
          
              
            
            <!-- Footer -->
            <div class="email-footer">
            <p>
                ${process.env.FROM_NAME || "Aastha Enterprises"} &bull; 
                ${new Date().getFullYear()} All Rights Reserved
              </p>
              <div >
                
                <div class="contact">
                  <i class="fas fa-envelope"></i> ${process.env.FROM_EMAIL || "shakshisingh1501990@gmail.com"} &nbsp;|&nbsp;

                  <i class="fas fa-phone"></i> +91-9076713270
                </div>
              </div>
              
              <p class="disclaimer">
                <i class="fas fa-info-circle"></i>
                This is a system-generated email. Please do not reply to this email.
                <br>If you have any questions, please contact our support team.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Convert PDF buffer to base64
    const pdfBase64 = pdfBuffer.toString("base64");

    console.log(`PDF Buffer size: ${pdfBuffer.length} bytes`);
    console.log(`Base64 size: ${pdfBase64.length} bytes`);
    console.log(`PDF size in KB: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Create attachment
    const attachment = [
      {
        content: pdfBase64,
        name: `${isProforma ? "Proforma-Invoice" : bill.billNumber}.pdf`,
        type: "application/pdf",
      },
    ];

    console.log(
      `Sending invoice ${bill.billNumber} to ${clientEmail} with PDF attachment`,
    );

    return await sendEmail(clientEmail, subject, htmlContent, attachment);
  } catch (error) {
    console.error("Error in sendBillEmail:", error.message);
    throw error;
  }
};

const sendRenewalReminder = async (bill, client, daysLeft) => {
  try {
    // Validate inputs
    if (!bill) throw new Error("Bill object is required");
    if (!client) throw new Error("Client object is required");
    if (!client.email) throw new Error("Client email is required");
    if (!daysLeft && daysLeft !== 0) throw new Error("Days left is required");

    const subject = `⚠️ Renewal Reminder: ${bill.service.replace(/_/g, " ")} - ${daysLeft} days left`;

    const htmlContent = getRenewalReminderEmail(bill, client, daysLeft);

    const payload = {
      sender: {
        name: "Aastha Enterprises",
        email: process.env.FROM_EMAIL || "shakshisingh1501990@gmail.com",
      },
      to: [
        {
          email: client.email,
          name: client.representativeName || "Client",
        },
      ],
      cc: [
        {
          email: process.env.FROM_EMAIL || "shakshisingh1501990@gmail.com",
        },
      ],
      subject,
      htmlContent,
    };

    console.log(
      `Sending renewal reminder to: ${client.email}, days left: ${daysLeft}`,
    );

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    console.log(
      `✅ Renewal reminder sent to ${client.email}, days left: ${daysLeft}, MessageId: ${response.data.messageId}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error sending renewal reminder:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    throw new Error(`Failed to send renewal reminder: ${error.message}`);
  }
};

module.exports = { sendEmail, sendBillEmail, sendRenewalReminder };
