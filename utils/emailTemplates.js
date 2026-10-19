const getRenewalReminderEmail = (bill, client, daysLeft) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Renewal Reminder</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f7fc;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          overflow: hidden;
          border: 1px solid #e8edf3;
        }
        .header {
          background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
          color: white;
          padding: 30px 40px 25px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .header p {
          margin: 8px 0 0;
          opacity: 0.9;
          font-size: 15px;
        }
        .content {
          padding: 35px 40px 30px;
        }
        .alert-box {
          background: #fff3e0;
          border-left: 4px solid #ff9800;
          padding: 18px 20px;
          border-radius: 6px;
          margin-bottom: 25px;
        }
        .alert-box .days {
          font-size: 32px;
          font-weight: 700;
          color: #e65100;
        }
        .alert-box .label {
          font-size: 16px;
          color: #e65100;
          font-weight: 600;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin: 20px 0 25px;
          background: #f8fafc;
          padding: 18px;
          border-radius: 8px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-item .label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .info-item .value {
          font-size: 15px;
          color: #0f172a;
          font-weight: 500;
          margin-top: 3px;
        }
        .contact-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #e2e8f0;
        }
        .contact-section h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #0f172a;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 8px 0;
          color: #334155;
          font-size: 14px;
        }
        .contact-item strong {
          color: #0f172a;
          min-width: 80px;
        }
        .btn {
          display: inline-block;
          background: #1a237e;
          color: white !important;
          padding: 14px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          margin: 10px 0;
          text-align: center;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #0d47a1;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 13px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
        .footer a {
          color: #1a237e;
          text-decoration: none;
        }
        .badge {
          display: inline-block;
          background: #ff9800;
          color: white;
          padding: 2px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        @media (max-width: 480px) {
          .content { padding: 20px; }
          .info-grid { grid-template-columns: 1fr; }
          .header h1 { font-size: 22px; }
          .header { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1> Renewal Reminder</h1>
          <p>Your subscription is about to expire</p>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <span class="days">${daysLeft}</span>
            <span class="label"> days left for renewal</span>
          </div>

          <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 15px;">
            Dear <strong>${client.representativeName || "Client"}</strong>,
          </p>
          <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 20px;">
            This is a friendly reminder that your <strong>${bill.service.replace(/_/g, " ")}</strong> subscription is expiring soon.
            Please renew your service to avoid any interruption.
          </p>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">Bill Number</span>
              <span class="value">${bill.billNumber}</span>
            </div>
            <div class="info-item">
              <span class="label">Service</span>
              <span class="value">${bill.service.replace(/_/g, " ")}</span>
            </div>
            <div class="info-item">
              <span class="label">Renewal Date</span>
              <span class="value">${new Date(bill.renewalDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <div class="info-item">
              <span class="label">Amount</span>
              <span class="value">₹${bill.amount.toLocaleString()}</span>
            </div>
          </div>

          <div class="contact-section">
            <h3> Need Assistance?</h3>
            <div class="contact-item">
              <strong>Email:</strong>
              <span>shakshisingh1501990@gmail.com</span>
            </div>
            <div class="contact-item">
              <strong>Phone:</strong>
              <span>+91-9076713270</span>
            </div>
            
          </div>



          <p style="font-size: 13px; color: #94a3b8; margin-top: 20px; text-align: center;">
            If you've already renewed, please ignore this email.
          </p>
        </div>

        <div class="footer">
          <p style="margin: 0;">
            &copy; ${new Date().getFullYear()} Aastha Enterprises. All rights reserved.<br>

          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { getRenewalReminderEmail };
