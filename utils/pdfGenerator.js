const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, "../public/aasthalogo.png");

    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString("base64");

      return `data:image/png;base64,${base64Logo}`;
    } else {
      console.warn("Logo file not found at:", logoPath);
      return "";
    }
  } catch (error) {
    console.error("Error reading logo:", error);
    return "";
  }
};

// ---------- Seal / Stamp ----------
const getSealBase64 = () => {
  try {
    const sealPath = path.join(__dirname, "../public/Aasthaseal.png");

    if (fs.existsSync(sealPath)) {
      const sealBuffer = fs.readFileSync(sealPath);
      return `data:image/png;base64,${sealBuffer.toString("base64")}`;
    } else {
      console.warn("Seal file not found at:", sealPath);
      return "";
    }
  } catch (error) {
    console.error("Error reading seal:", error);
    return "";
  }
};

const companyInfo = {
  companyName: "ASHATHA ENTERPRISES",
  addressLine1: "B-5 Jyoti building,66 behind icici bank",
  addressLine2: "Nehru place delhi",
  cityPincode: "Delhi-110019",
  // gstin: "07AALCP3083C1ZH",
  stateName: "Delhi",
  stateCode: "07",
  // cin: "U74999DL2020PTC367460",
  email: "shakshisingh1501990@gmail.com",
  // website: "www.cloudedata.com",
  bankAccountHolder: "Ashatha ENTERPRISES",
  bankName: "Axis Bank",
  bankAccountNumber: "923010044616794",
  bankBranch: "Boisar (Boisor)",
  bankIFSC: "UTIB0001291",
  declarationTerms: [
    "Support Other Than Cloud Services will not be Provided.",
    "For Software related query, Kindly Contact to the respected Software Company only.",
    "Governing Law & Jurisdiction.",
    "This Agreement shall be governed by the laws of India, and any disputes shall fall under the exclusive jurisdiction of the courts at New Delhi.",
  ],
  governmentLaw: "",
  jurisdiction: "DELHI",
};

// HSN codes per service
const SERVICE_HSN = {
  Printer: "84439990",
};

const SERVICE_NAMES = {
  Printer: "Printer",
};

const GST_RATE = 18; // 18% GST

// ---------- Number to Words (Indian system) ----------
const numberToWords = (num) => {
  if (num === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (num < 20) return ones[num];
  if (num < 100)
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  if (num < 1000)
    return (
      ones[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " and " + numberToWords(num % 100) : "")
    );
  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 ? " " + numberToWords(num % 1000) : "")
    );
  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 ? " " + numberToWords(num % 100000) : "")
    );
  return (
    numberToWords(Math.floor(num / 10000000)) +
    " Crore" +
    (num % 10000000 ? " " + numberToWords(num % 10000000) : "")
  );
};

const amountInWords = (amount) => {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToWords(rupees) + " Rupees";
  if (paise > 0) words += " and " + numberToWords(paise) + " Paise";
  words += " Only";
  return words;
};

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

// ---------- Terms & Conditions (condensed key points) ----------
const termsAndConditionsPage1 = [
  {
    title: "Scope of Services",
    points: [
      "Release PO.: Received in Ashatha Enterprises, Delivery: Within 2-3 working days after releasing PO after order Acceptance. GST Paid Warranty as per company Payment 100% advance Price will be changed as per Market up-down Any other work will be charged extra as per the work.",
    ],
  },
];

// ---------- Generate HTML ----------
const generateHTML = (bill, client, pdfOptions = {}) => {
  const logoUrl = getLogoBase64();
  const sealUrl = getSealBase64();
  const isProforma =
    pdfOptions.forceProforma !== undefined
      ? pdfOptions.forceProforma
      : bill.status === "draft";
  const isPaid = !isProforma && bill.status === "approved";

  const baseAmount = parseFloat(bill.amount) || 0;
  const gstType = ["IGST", "CGST_SGST", "NO_GST"].includes(bill.gstType)
    ? bill.gstType
    : "IGST";
  const isSplitGst = gstType === "CGST_SGST";
  const isNoGst = gstType === "NO_GST";
  const cgstAmount = isSplitGst
    ? parseFloat(((baseAmount * 9) / 100).toFixed(2))
    : 0;
  const sgstAmount = isSplitGst
    ? parseFloat(((baseAmount * 9) / 100).toFixed(2))
    : 0;
  const igstAmount =
    gstType === "IGST"
      ? parseFloat(((baseAmount * GST_RATE) / 100).toFixed(2))
      : 0;
  const gstAmount = isSplitGst ? cgstAmount + sgstAmount : igstAmount;
  const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
  const hsnCode = SERVICE_HSN[bill.service] || "998315";
  const serviceName = SERVICE_NAMES[bill.service] || bill.service;
  const lineItems = Array.isArray(bill.lineItems) ? bill.lineItems : [];
  const hasLineItems = lineItems.length > 0;
  const totalQty = hasLineItems
    ? lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : null;

  // Build specs rows — exclude Amount, Billing date, Renewal date from table (shown separately)
  const excludedKeys = [
    "amount",
    "billing date",
    "renewal date",
    "billingdate",
    "renewaldate",
  ];
  const specRows = (bill.specifications || [])
    .filter(
      (s) => !excludedKeys.includes(s.key.toLowerCase().replace(/\s/g, "")),
    )
    .map(
      (s) => `
      <tr>
        <td style="border:1px solid #ccc;padding:7px 10px;font-size:11px;">${s.key}</td>
        <td style="border:1px solid #ccc;padding:7px 10px;font-size:11px;">${s.value || "—"}</td>
      </tr>`,
    )
    .join("");

  const Page1termsHTML = termsAndConditionsPage1
    .map(
      (section) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;font-weight:700;color:#1e293b;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px;">${section.title}</div>
        <ul style="margin:0;padding-left:18px;">
          ${section.points.map((p) => `<li style="font-size:10.5px;color:#334155;line-height:1.6;margin-bottom:3px;">${p}</li>`).join("")}
        </ul>
      </div>`,
    )
    .join("");

  // Seal + signature block (bottom right)
  const sealBlockHTML = `
    <div style="width:150px;flex-shrink:0;text-align:center;page-break-inside:avoid;margin-top:5px;">
      <div style="font-size:10px;font-weight:700;color:#1e293b;">For ${companyInfo.companyName}</div>
      ${
        sealUrl
          ? `<img src="${sealUrl}" alt="Company Seal" style="display:block;width:100px;height:100px;object-fit:contain;margin:2px auto;" />`
          : `<div style="height:70px;"></div>`
      }
      <div style="font-size:10px;font-weight:600;color:#1e293b;border-top:1px solid #aaa;padding-top:3px;">Authorised Signatory</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${bill.billNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, sans-serif; }

    body { background:#fff; color:#1e293b; }

    /* ===== PAGE 1 ===== */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 5mm 14mm 0mm  14mm;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }
    .page:last-child { page-break-after: avoid; }

    .invoice-header {
  position: relative;

  padding-bottom: 6px;
  margin-bottom: 5px;
  min-height: 30px;
}

.page::before {
  content: "";
  position: absolute;

  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-20deg);

  width: 120mm;   /* Adjust as needed */
  height: 120mm;

  background: url("${logoUrl}") no-repeat center;
  background-size: contain;

  opacity: 0.2;      /* 0.02 - 0.08 looks best */
  z-index: 0;

  pointer-events: none;
}

/* Everything else should stay above watermark */
.page > * {
  position: relative;
  z-index: 1;
}

.company-logo {
  position: absolute;
  top: 0;
  left: 0;
  width: 92px;     
  height: auto;
}

.invoice-title {
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #1e293b;
  line-height: 42px; /* Vertically align with logo */
}

    /* Top info grid */
    .top-grid {
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:0;
      border:1px solid #ccc;
      margin-bottom:0;
    }
    .top-grid .cell {
      padding:8px 10px;
      font-size:10.5px;
      line-height:1.55;
    }
    .top-grid .cell.border-right { border-right:1px solid #ccc; }
    .top-grid .cell.border-bottom { border-bottom:1px solid #ccc; }
    .company-name-top {
      font-size:13px;
      font-weight:700;
      color:#1e293b;
      margin-bottom:3px;
    }
    .label-sm {
      font-size:9.5px;
      font-weight:700;
      color:#64748b;
      text-transform:uppercase;
      letter-spacing:0.3px;
    }
    .value-md {
      font-size:11.5px;
      font-weight:700;
      color:#1e293b;
    }

    /* Bill To */
    .bill-to-section {
      border:1px solid #ccc;
      border-top:none;
      padding:4px 6px;
      font-size:10.5px;
      line-height:1.4;
    }
    .section-head {
      font-size:10px;
      font-weight:700;
      text-transform:uppercase;
      color:#64748b;
      letter-spacing:0.4px;
      margin-bottom:4px;
    }
    .buyer-name {
      font-size:13px;
      font-weight:700;
      color:#1e293b;
    }

    /* Service + Specs Table */
    .specs-table {
      width:100%;
      border-collapse:collapse;
      margin-top:8px;
      font-size:11px;
    }
    .specs-table thead tr {
      background:#f1f5f9;
    }
    .specs-table th {
      border:1px solid #ccc;
      padding:7px 10px;
      text-align:left;
      font-size:10px;
      font-weight:700;
      color:#475569;
      text-transform:uppercase;
      letter-spacing:0.3px;
    }
    .specs-table td {
      border:1px solid #ccc;
      padding:7px 10px;
      font-size:11px;
      color:#1e293b;
    }
    .specs-table tr:nth-child(even) td { background:#f8fafc; }

    /* Amount section */
    .amount-box {
      border:1px solid #ccc;
      border-top:none;
    }
    .amount-row {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:6px 10px;
      font-size:11px;
      border-bottom:1px solid #f1f5f9;
    }
    .amount-row:last-child { border-bottom:none; }
    .amount-row.total-row {
      background:#EBEBEB;
      color:#000000;
      font-weight:700;
      font-size:12px;
    }
    .amount-row.words-row {
      font-size:10.5px;
      font-style:italic;
      color:#475569;
      background:#f8fafc;
    }

    /* Tax table */
    .tax-table {
      width:100%;
      border-collapse:collapse;
      margin-top:8px;
      font-size:10.5px;
    }
    .tax-table th {
      border:1px solid #ccc;
      padding:6px 10px;
      background:#f1f5f9;
      font-size:9.5px;
      font-weight:700;
      text-transform:uppercase;
      color:#475569;
      text-align:center;
    }
    .tax-table td {
      border:1px solid #ccc;
      padding:6px 10px;
      text-align:center;
      color:#1e293b;
    }

    /* Bank Details */
    .bank-section {
      margin-top:8px;
      border:1px solid #ccc;
      padding:8px 10px;
      font-size:10.5px;
      line-height:1.7;
    }
    .bank-grid {
      display:grid;
      grid-template-columns:160px 1fr;
      gap:2px 8px;
      font-size:10.5px;
    }
    .bank-key { color:#64748b; font-size:10px; }
    .bank-val { font-weight:600; color:#1e293b; }

    /* Signature row */
    .sig-row {
      display:flex;
      justify-content:space-between;
      margin-top:10px;
      font-size:10.5px;
    }
    .sig-box {
      text-align:center;
      width:180px;
    }

    /* Footer p1 */
  .page1-footer {
  position: absolute;
  left: 14mm;
  right: 14mm;
  bottom: 10mm;

  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  font-size: 9.5px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.5;
}

    /* ===== PAGE 2 - Terms ===== */
    .terms-page {
      width:210mm;
      height:297mm;
      padding:14mm 14mm 14mm 14mm;
      position: relative;
      overflow: hidden;
  page-break-after: avoid;
  box-sizing: border-box;
    }
    .terms-title {
      font-size:12px;
      font-weight:700;
      color:#1e293b;
      text-transform:uppercase;
      letter-spacing:0.5px;
      margin-bottom:2px;
      padding-bottom:4px;
      margin-top:7px;
     border-bottom:1px solid #D5D5D5
; 
    }
    .terms-subtitle {
      font-size:10px;
      color:#64748b;
      margin-bottom:8px;
    }

    .terms-page::before {
  content: "";
  position: absolute;

  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-20deg);

  width: 120mm;
  height: 120mm;

  background: url("${logoUrl}") no-repeat center;
  background-size: contain;

  opacity: 0.2;
  z-index: 0;

  pointer-events: none;
}

.terms-page > * {
  position: relative;
  z-index: 1;
}

  .terms-footer {
  position: absolute;
  left: 14mm;
  right: 14mm;
  bottom: 4mm;

  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  font-size: 9.5px;
  color: #64748b;
  text-align: center;
  line-height: 1.6;
}
  </style>
</head>
<body>

<!-- ==================== PAGE 1: INVOICE ==================== -->
<div class="page">

  ${
    isPaid
      ? `
  <div style="
    position: absolute;
    top: 12%;
    left: 80%;
     transform: translate(-50%, -50%) ;
    z-index: 10;
    pointer-events: none;
    border: 5px solid #4CAF50;
    border-radius: 12px;
    padding: 8px 18px;
    text-align: center;
    opacity: 0.60;
  ">
    <div style="font-size:18px;font-weight:900;color:#4CAF50;letter-spacing:2px;line-height:1;">PAID</div>
    <div style="font-size:8px;font-weight:700;color:#4CAF50;letter-spacing:1px;">APPROVED</div>
  </div>`
      : ""
  }

     <div class="invoice-header">
    <img
      class="company-logo"
      src="${logoUrl}"
      alt="Aastha Logo"
    />
    

    <div class="invoice-title"> ${isProforma ? "Proforma Invoice" : "Tax Invoice"}</div>
  </div>

  <!-- Top grid: Company info + Invoice details -->
  <div class="top-grid">
    <!-- Left: Company -->
    <div class="cell border-right border-bottom">
      <div class="company-name-top">${companyInfo.companyName}</div>
      <div>${companyInfo.addressLine1}, ${companyInfo.addressLine2}</div>
      <div>${companyInfo.cityPincode}</div>
  
      <div>State: ${companyInfo.stateName} | Code: ${companyInfo.stateCode}</div>
<div>Phone: 9076713270</div>
      <div>Email: ${companyInfo.email}</div>
      
    </div>
    <!-- Right: Invoice meta -->
    <div class="cell border-bottom">
      <div style="margin-bottom:6px;">
        <div class="label-sm">Invoice No.</div>
        <div class="value-md"> ${isProforma ? "Proforma Invoice" : bill.billNumber}</div>
      </div>
      <div style="margin-bottom:6px;">
        <div class="label-sm">Billing Date</div>
        <div class="value-md">${new Date(bill.billingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div>
      <div style="margin-bottom:6px;">
        <div class="label-sm">Renewal Date</div>
        <div class="value-md">${bill.renewalDate ? new Date(bill.renewalDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
      </div>
      <div>
        <div class="label-sm">Service</div>
        <div class="value-md">${serviceName}</div>
      </div>
    </div>
  </div>

  <!-- Bill To -->
  <div class="bill-to-section">
    <div class="section-head">Bill To</div>
    <div class="buyer-name">${client.companyName}</div>
    <div>Representative: <strong>${client.representativeName}</strong></div>
    ${client.phone ? `<div>Phone: ${client.phone}</div>` : ""}
    ${client.email ? `<div>Email: ${client.email}</div>` : ""}
    ${client.gstNumber ? `<div>GSTIN: <strong>${client.gstNumber}</strong></div>` : ""}
    ${client.address ? `<div>Address: ${client.address}</div>` : ""}
  </div>

  <!-- Specifications Table -->

  <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;">
    <thead>
      <tr style="background:#F1F5F9;">
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:5%;font-size:10px;">Sl<br>No.</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:36%;font-size:10px;">Description of<br>Services</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:7%;font-size:10px;">GST<br>Rate</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:10%;font-size:10px;">Quantity</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:right;width:12%;font-size:10px;">Rate</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:center;width:6%;font-size:10px;">per</th>
        <th style="border:1px solid #aaa;padding:5px 6px;text-align:right;width:14%;font-size:10px;">Amount</th>
      </tr>
    </thead>
    <tbody>

      ${
        hasLineItems
          ? lineItems
              .map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const amount = Number(item.amount) || qty * rate;
                return `
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${index + 1}</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;">
          <div style="font-weight:700;font-size:11px;">${item.description || ""}</div>
        </td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${isNoGst ? 0 : GST_RATE}%</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${String(qty).padStart(2, "0")} Nos.</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-size:11px;">${formatINR(rate)}</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">Nos.</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-weight:700;font-size:11px;">${formatINR(amount)}</td>
      </tr>`;
              })
              .join("")
          : `
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">1</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;">
          <div style="font-weight:700;font-size:11px;">${serviceName}</div>
          <div style="font-size:10px;color:#555;">From ${new Date(bill.billingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}${bill.renewalDate ? ` to ${new Date(bill.renewalDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}</div>
        </td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">${isNoGst ? 0 : GST_RATE}%</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">
          ${(() => {
            const qSpec = (bill.specifications || []).find(
              (s) => s.key.toLowerCase() === "quantity",
            );
            return qSpec ? qSpec.value + " No." : "1 No.";
          })()}
        </td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-size:11px;">${formatINR(baseAmount)}</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:11px;">No.</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-weight:700;font-size:11px;">${formatINR(baseAmount)}</td>
      </tr>
      ${(bill.specifications || [])
        .filter(
          (s) =>
            ![
              "quantity",
              "amount",
              "billing date",
              "renewal date",
              "billingdate",
              "renewaldate",
            ].includes(s.key.toLowerCase().replace(/\s/g, "")),
        )
        .map(
          (s) => `
        <tr>
          <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;padding:3px 6px;"></td>
          <td style="border-right:1px solid #aaa;padding:3px 6px 3px 18px;font-size:10.5px;color:#333;">
            ${s.key}${s.value ? " - " + s.value : ""}
          </td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
        </tr>`,
        )
        .join("")}`
      }

      <!-- Empty filler rows -->
      ${Array(Math.max(2, 6 - (hasLineItems ? lineItems.length : 1)))
        .fill(
          `
        <tr style="height:18px;">
          <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
          <td style="border-right:1px solid #aaa;"></td>
        </tr>`,
        )
        .join("")}

      ${
        isSplitGst
          ? `
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;color:#333;">
          CGST Output-9% (${companyInfo.stateName})
        </td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">9</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">%</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;">${formatINR(cgstAmount)}</td>
      </tr>
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;color:#333;">
          SGST Output-9% (${companyInfo.stateName})
        </td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">9</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">%</td>
        <td style="border-right:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;">${formatINR(sgstAmount)}</td>
      </tr>`
          : isNoGst
            ? ""
            : `
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;color:#333;">
          IGST Output-${GST_RATE}% (${companyInfo.stateName})
        </td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">${GST_RATE}</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:center;font-size:10.5px;">%</td>
        <td style="border-right:1px solid #aaa;border-top:1px solid #aaa;padding:5px 6px;text-align:right;font-size:10.5px;">${formatINR(igstAmount)}</td>
      </tr>`
      }

      <!-- Round Off row -->
      <tr>
        <td style="border-left:1px solid #aaa;border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;padding:3px 6px;text-align:right;font-size:10.5px;color:#333;">Round Off</td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;"></td>
        <td style="border-right:1px solid #aaa;padding:3px 6px;text-align:right;font-size:10.5px;">
          ${(() => {
            const rounded = Math.round(totalAmount);
            const diff = rounded - totalAmount;
            return (diff >= 0 ? "+" : "") + formatINR(diff);
          })()}
        </td>
      </tr>

      <!-- Total row -->
      <tr style="background:#F1F5F9;border-top:2px solid #aaa;">
        <td style="border:1px solid #aaa;padding:6px;"></td>
        <td style="border:1px solid #aaa;padding:6px;font-weight:700;font-size:11px;">Total</td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;padding:6px;text-align:center;font-weight:700;font-size:11px;">
          ${
            hasLineItems
              ? `${String(totalQty).padStart(2, "0")} Nos.`
              : (() => {
                  const qSpec = (bill.specifications || []).find(
                    (s) => s.key.toLowerCase() === "quantity",
                  );
                  return qSpec ? qSpec.value + " No." : "1 No.";
                })()
          }
        </td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;"></td>
        <td style="border:1px solid #aaa;padding:6px;text-align:right;font-weight:700;font-size:12px;">₹ ${formatINR(Math.round(totalAmount))}</td>
      </tr>

    </tbody>
  </table>

  <!-- Amount in Words row (below table, Tally style) -->
  <div style="border:1px solid #aaa;border-top:none;display:flex;justify-content:space-between;padding:5px 8px;font-size:10.5px;background:#F1F5F9;">
    <span><strong>Amount Chargeable (in words):</strong> &nbsp; INR ${amountInWords(Math.round(totalAmount))}</span>
    <span style="color:#555;font-style:italic;">E. &amp; O.E.</span>
  </div>

  <!-- GST / Tax Breakup Table -->
  <table class="tax-table">
    <thead>
      <tr>
        <th>HSN/SAC</th>
        <th>Taxable Value (₹)</th>
        ${
          isSplitGst
            ? `<th>CGST Rate</th><th>CGST Amt (₹)</th><th>SGST Rate</th><th>SGST Amt (₹)</th>`
            : isNoGst
              ? `<th>GST Rate</th><th>GST Amount (₹)</th>`
              : `<th>IGST Rate</th><th>IGST Amount (₹)</th>`
        }
        <th>Total Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${hsnCode}</td>
        <td>${formatINR(baseAmount)}</td>
        ${
          isSplitGst
            ? `<td>9%</td><td>${formatINR(cgstAmount)}</td><td>9%</td><td>${formatINR(sgstAmount)}</td>`
            : `<td>${isNoGst ? 0 : GST_RATE}%</td><td>${formatINR(igstAmount)}</td>`
        }
        <td><strong>${formatINR(totalAmount)}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- Amount Breakup Box -->
  <div class="amount-box" style="margin-top:0;">
    <div class="amount-row">
      <span>Taxable Amount (Before GST)</span>
      <span>₹ ${formatINR(baseAmount)}</span>
    </div>
    ${
      isSplitGst
        ? `
    <div class="amount-row">
      <span>CGST @ 9%</span>
      <span>₹ ${formatINR(cgstAmount)}</span>
    </div>
    <div class="amount-row">
      <span>SGST @ 9%</span>
      <span>₹ ${formatINR(sgstAmount)}</span>
    </div>`
        : isNoGst
          ? ""
          : `
    <div class="amount-row">
      <span>IGST @ ${GST_RATE}%</span>
      <span>₹ ${formatINR(igstAmount)}</span>
    </div>`
    }
    <div class="amount-row total-row">
      <span>Total Amount Payable</span>
      <span>₹ ${formatINR(totalAmount)}</span>
    </div>
  </div>

<!-- Bank Details -->
<div style="margin-top:8px;border:1px solid #aaa;padding:10px 14px;page-break-inside:avoid;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.4px;margin-bottom:6px;">
    Company's Bank Details
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10.5px;">
    <div style="display:flex;gap:8px;">
      <span style="color:#64748b;font-size:10px;min-width:100px;">Account Holder</span>
      <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankAccountHolder}</span>
    </div>
    <div style="display:flex;gap:8px;">
      <span style="color:#64748b;font-size:10px;min-width:100px;">Account No.</span>
      <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankAccountNumber}</span>
    </div>
    <div style="display:flex;gap:8px;">
      <span style="color:#64748b;font-size:10px;min-width:100px;">Bank Name</span>
      <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankName}</span>
    </div>
    <div style="display:flex;gap:8px;">
      <span style="color:#64748b;font-size:10px;min-width:100px;">Branch</span>
      <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankBranch}</span>
    </div>
    <div style="display:flex;gap:8px;">
      <span style="color:#64748b;font-size:10px;min-width:100px;">IFSC Code</span>
      <span style="font-weight:600;color:#1e293b;">: ${companyInfo.bankIFSC}</span>
    </div>
  </div>
</div>

  <!-- Terms (left) + Seal / Authorised Signatory (bottom right) -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;page-break-inside:avoid;">
    <div style="flex:1;">
      <div class="terms-title">Terms &amp; Conditions</div>
      <div class="terms-subtitle">
        Invoice No: <strong>${bill.billNumber}</strong> &nbsp;|&nbsp;
        ${companyInfo.companyName} &nbsp;|&nbsp;
      </div>
      ${Page1termsHTML}
    </div>

    ${sealBlockHTML}
  </div>

  <!-- Page 1 Footer -->
 <div class="page1-footer" style="position:static;padding-top:8px;margin-top:6px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;text-align:center;line-height:1.5; page-break-inside:avoid;">
    <strong>SUBJECT TO ${companyInfo.jurisdiction} JURISDICTION</strong> &nbsp;|&nbsp;
    This is a System Generated Invoice |&nbsp; Page 1 of 2
  </div>
</div>

</body>
</html>`;
};

// ---------- Main export ----------

const generatePdf = async (bill, client, pdfOptions = {}) => {
  console.log(`Generating PDF for bill: ${bill.billNumber}`);

  let browser = null;
  let page = null;

try {
  browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/usr/bin/google-chrome-stable', 
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--disable-web-security",
      "--disable-features=IsolateOrigins",
    ],
  });
    page = await browser.newPage();

    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 1,
    });

    // Browser/page error logging
    page.on("error", (error) => {
      console.error("Puppeteer page crashed:", error.message);
    });

    page.on("pageerror", (error) => {
      console.error("HTML JavaScript error:", error.message);
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        console.error("Browser console error:", message.text());
      }
    });

    // Generate invoice HTML
    const html = generateHTML(bill, client, pdfOptions);

    console.log("Setting HTML content...");

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for fonts
    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    // Wait for invoice images (logo + seal) to load or fail
    await page.evaluate(async () => {
      const images = Array.from(document.images);

      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        }),
      );
    });

    console.log("HTML ready. Generating PDF...");

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
      displayHeaderFooter: false,
      landscape: false,
    });

    console.log(
      `PDF generated successfully. Size: ${(pdfBuffer.length / 1024).toFixed(
        2,
      )} KB`,
    );

    // Save a debug copy safely
    try {
      const debugDir = path.join(__dirname, "debug");

      fs.mkdirSync(debugDir, { recursive: true });

      // Replace characters that are invalid in Windows filenames
      const safeBillNumber = String(bill.billNumber).replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_",
      );

      const debugPath = path.join(debugDir, `${safeBillNumber}.pdf`);

      fs.writeFileSync(debugPath, pdfBuffer);

      console.log(`Debug PDF saved: ${debugPath}`);
    } catch (debugError) {
      // Debug saving should not prevent the actual PDF download
      console.error("Could not save debug PDF:", debugError.message);
    }

    // Return the PDF for download
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("PDF generation failed:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      browserConnected: browser?.connected,
      pageClosed: page?.isClosed(),
    });

    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    // Always close the browser
    if (browser) {
      try {
        await browser.close();
        console.log("Puppeteer browser closed.");
      } catch (closeError) {
        console.error("Error closing Puppeteer browser:", closeError.message);
      }
    }
  }
};

module.exports = { generatePdf };
