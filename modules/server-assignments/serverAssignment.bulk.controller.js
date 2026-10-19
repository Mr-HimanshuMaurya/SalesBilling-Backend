const ServerAssignment = require("./serverAssignment.model");
const Server = require("../servers/server.model");
const Client = require("../clients/client.model");
const { successResponse, errorResponse } = require("../../utils/apiResponse");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

//  Helper: Convert Excel date serial number to Date
const excelDateToJSDate = (serial) => {
  if (!serial) return null;

  // If it's already a string, try to parse it
  if (typeof serial === "string") {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    return null;
  }

  // If it's a number (Excel serial date)
  if (typeof serial === "number") {
    // Excel serial date: days since 1900-01-01
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + serial * 86400000);
    return date;
  }

  return null;
};

// Helper: Find or create client by name
const findOrCreateClient = async (clientName, userId) => {
  if (!clientName || clientName.trim() === "") {
    throw new Error("Client name is required");
  }

  let client = await Client.findOne({
    $or: [
      {
        companyName: { $regex: new RegExp("^" + clientName.trim() + "$", "i") },
      },
      {
        representativeName: {
          $regex: new RegExp("^" + clientName.trim() + "$", "i"),
        },
      },
    ],
  });

  if (!client) {
    client = new Client({
      companyName: clientName.trim(),
      representativeName: clientName.trim(),
      createdBy: userId,
    });
    await client.save();
  }

  return client;
};

// Helper: Find or create server by IP
const findOrCreateServer = async (ipAddress, serverData = {}, userId) => {
  if (!ipAddress || ipAddress.trim() === "") {
    throw new Error("Server IP is required");
  }

  let server = await Server.findOne({ ipAddress: ipAddress.trim() });

  if (!server) {
    server = new Server({
      name: `Server-${ipAddress.trim()}`,
      ipAddress: ipAddress.trim(),
      osType: "linux",
      specs: {
        cpu: serverData.cpu || "N/A",
        ram: serverData.ram || "N/A",
        storage: serverData.storage || "N/A",
        bandwidth: serverData.bandwidth || "N/A",
      },
      status: "active",
      createdBy: userId,
    });
    await server.save();
  }

  return server;
};

// Bulk upload assignments
const bulkUploadAssignments = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, "Please upload an Excel file", 400);
    }

    const userId = req.user.id;
    const filePath = req.file.path;

    // Read Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return errorResponse(res, "Excel file is empty", 400);
    }

    console.log(`📊 Processing ${data.length} records from Excel`);

    const results = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
      skipped: [],
    };

    // Process each row
    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 2;

      try {
        // Extract data with proper column mapping (case-insensitive)
        const clientName =
          row["Client Name"] || row["client name"] || row["CLIENT NAME"] || "";
        const serverIp =
          row["Server Ip"] || row["server ip"] || row["SERVER IP"] || "";
        const serverType = (
          row["Server Type"] ||
          row["server type"] ||
          row["SERVER TYPE"] ||
          "shared"
        )
          .toString()
          .toLowerCase();
        const noOfUsers = parseInt(
          row["No of users"] || row["no of users"] || row["NO OF USERS"] || 0,
        );
        const usernames =
          row["Username"] ||
          row["Username "] ||
          row["username"] ||
          row["USERNAME"] ||
          "";
        const cpu = row["Cpu"] || row["cpu"] || row["CPU"] || "";
        const ram = row["Ram"] || row["ram"] || row["RAM"] || "";
        const storage =
          row["Storage"] || row["storage"] || row["STORAGE"] || "";
        const bandwidth =
          row["Bandwith"] ||
          row["bandwith"] ||
          row["BANDWITH"] ||
          row["Bandwidth"] ||
          row["bandwidth"] ||
          "";
        const windowsKey =
          row["Widows Key"] ||
          row["windows key"] ||
          row["WINDOWS KEY"] ||
          row["Windows Key"] ||
          "";
        const validityFrom =
          row["validity from"] ||
          row["validity from "] ||
          row["Validity From"] ||
          row["VALIDITY FROM"] ||
          "";
        const validUntil =
          row["Valid Until"] || row["valid until"] || row["VALID UNTIL"] || "";
        const status = (
          row["Status"] ||
          row["status"] ||
          row["STATUS"] ||
          "pending"
        )
          .toString()
          .toLowerCase();

        //  Debug log
        console.log(`Row ${rowNumber}:`, {
          clientName,
          serverIp,
          validityFrom,
          validUntil,
        });

        // Validate required fields
        if (!clientName) {
          throw new Error(`Client Name is required`);
        }
        if (!serverIp) {
          throw new Error(`Server IP is required`);
        }
        if (!validityFrom || !validUntil) {
          throw new Error(`Validity dates are required`);
        }

        //  Convert Excel dates to proper Date objects
        let startDate = excelDateToJSDate(validityFrom);
        let endDate = excelDateToJSDate(validUntil);

        //  If still invalid, try parsing as string
        if (!startDate && typeof validityFrom === "string") {
          startDate = new Date(validityFrom);
        }
        if (!endDate && typeof validUntil === "string") {
          endDate = new Date(validUntil);
        }

        if (!startDate || isNaN(startDate.getTime())) {
          throw new Error(`Invalid validity from date: ${validityFrom}`);
        }
        if (!endDate || isNaN(endDate.getTime())) {
          throw new Error(`Invalid valid until date: ${validUntil}`);
        }
        if (endDate < startDate) {
          throw new Error(`Valid until must be after valid from`);
        }

        // Find or create client and server
        const client = await findOrCreateClient(clientName, userId);
        const server = await findOrCreateServer(
          serverIp,
          { cpu, ram, storage, bandwidth },
          userId,
        );

        // Check if assignment already exists
        const existingAssignment = await ServerAssignment.findOne({
          client: client._id,
          server: server._id,
          status: { $ne: "expired" },
        });

        if (existingAssignment) {
          results.skipped.push({
            row: rowNumber,
            client: clientName,
            server: serverIp,
            reason: "Assignment already exists",
          });
          results.failed++;
          continue;
        }

        // Parse usernames
        const usernameArray = usernames
          ? usernames
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean)
          : [];

        const sharedUserDetails = usernameArray.map((username) => ({
          username,
        }));

        //  Determine status properly
        let finalStatus = "pending";
        if (status === "active") {
          finalStatus = "active";
        } else if (status === "inactive" || status === "expired") {
          finalStatus = "expired";
        } else {
          finalStatus = "pending";
        }

        // Create assignment
        const assignmentData = {
          client: client._id,
          server: server._id,
          serverType: serverType === "dedicated" ? "dedicated" : "shared",
          sharedUsers: noOfUsers || usernameArray.length || 0,
          sharedUserDetails: sharedUserDetails,
          configuration: {
            cpu: cpu || server.specs?.cpu || "",
            ram: ram || server.specs?.ram || "",
            storage: storage || server.specs?.storage || "",
            bandwidth: bandwidth || server.specs?.bandwidth || "",
          },
          windowsKey: windowsKey || "",
          windowsKeyLastDigits: windowsKey ? String(windowsKey).slice(-5) : "",
          validityStart: startDate,
          validityEnd: endDate,
          status: finalStatus,
          assignedBy: userId,
          notes: `Bulk uploaded from Excel`,
        };

        const assignment = new ServerAssignment(assignmentData);
        await assignment.save();

        // Update server total clients count
        server.totalClients = await ServerAssignment.countDocuments({
          server: server._id,
          status: "active",
        });
        await server.save();

        results.successful++;
        results.created.push({
          row: rowNumber,
          client: clientName,
          server: serverIp,
          assignmentId: assignment._id,
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: `Row ${rowNumber}: ${error.message}`,
          data: row,
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    return successResponse(
      res,
      {
        summary: {
          total: results.total,
          successful: results.successful,
          failed: results.failed,
          skipped: results.skipped.length,
        },
        details: {
          created: results.created,
          skipped: results.skipped,
          errors: results.errors,
        },
      },
      `Bulk upload completed: ${results.successful} successful, ${results.failed} failed`,
    );
  } catch (error) {
    console.error("Bulk upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return errorResponse(res, error.message);
  }
};

// Download sample Excel template
const downloadSampleTemplate = async (req, res) => {
  try {
    const sampleData = [
      {
        "Client Name": "Sample Client",
        "Server Ip": "192.168.1.100",
        "Server Type": "Shared",
        "No of users": "3",
        Username: "user1, user2, user3",
        Cpu: "4 vCPU",
        Ram: "16 GB",
        Storage: "200 GB SSD",
        Bandwith: "1 TB",
        "Widows Key": "WIN-XXXXX-XXXXX",
        "validity from": "2024-01-01",
        "Valid Until": "2025-01-01",
        Status: "Active",
      },
    ];

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(sampleData);

    //  Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 20 }, // Client Name
      { wch: 18 }, // Server Ip
      { wch: 15 }, // Server Type
      { wch: 12 }, // No of users
      { wch: 25 }, // Username
      { wch: 15 }, // Cpu
      { wch: 15 }, // Ram
      { wch: 15 }, // Storage
      { wch: 15 }, // Bandwith
      { wch: 25 }, // Widows Key
      { wch: 15 }, // validity from
      { wch: 15 }, // Valid Until
      { wch: 15 }, // Status
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, "Assignments");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Server_Assignment_Template.xlsx",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading template:", error);
    return errorResponse(res, error.message);
  }
};

module.exports = {
  bulkUploadAssignments,
  downloadSampleTemplate,
};
