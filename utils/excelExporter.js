const xlsx = require("xlsx");

const exportBillsToExcel = (bills) => {
  // Prepare data for Excel
  const excelData = bills.map((bill, index) => {
    const amount = Number(bill.amount || 0);
    const amountWithGST = Math.round(amount * 1.18);

    return {
      "S.No": index + 1,
      "Bill Number": bill.billNumber || "",
      Client: bill.client?.companyName || bill.client?.representativeName || "",
      Service: bill.service?.replace(/_/g, " ") || "",
      "Amount (₹)": amountWithGST,
      Status: bill.status?.toUpperCase() || "",
      "Created By": bill.createdBy?.name || "",
      "Created At": bill.createdAt
        ? new Date(bill.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })
        : "",
      "Billing Date": bill.billingDate
        ? new Date(bill.billingDate).toLocaleDateString("en-IN")
        : "",
      "Renewal Date": bill.renewalDate
        ? new Date(bill.renewalDate).toLocaleDateString("en-IN")
        : "",
      "Approved By": bill.approvedBy?.name || "",
      "Approved At": bill.approvedAt
        ? new Date(bill.approvedAt).toLocaleDateString("en-IN")
        : "",
      "Correction Reason": bill.correctionReason || "",
    };
  });

  // Create workbook
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 6 }, // S.No
    { wch: 18 }, // Bill Number
    { wch: 25 }, // Client
    { wch: 20 }, // Service
    { wch: 15 }, // Amount
    { wch: 18 }, // Status
    { wch: 20 }, // Created By
    { wch: 22 }, // Created At
    { wch: 15 }, // Billing Date
    { wch: 15 }, // Renewal Date
    { wch: 20 }, // Approved By
    { wch: 15 }, // Approved At
    { wch: 30 }, // Correction Reason
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, "Bills");

  return workbook;
};

module.exports = { exportBillsToExcel };
