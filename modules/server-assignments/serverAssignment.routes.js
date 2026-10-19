const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const assignmentController = require("./serverAssignment.controller");
const { auth } = require("../../middleware/auth.middleware");
const { authorize } = require("../../middleware/role.middleware");
const { ROLES } = require("../../constants/roles");
const {
  bulkUploadAssignments,
  downloadSampleTemplate,
} = require("./serverAssignment.bulk.controller");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!require("fs").existsSync(uploadDir)) {
      require("fs").mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `bulk-upload-${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

router.use(auth);
router.use(authorize(ROLES.SUPERADMIN, ROLES.SERVER_ADMIN));

router.post("/", assignmentController.createAssignment);
router.get("/", assignmentController.getAssignments);
router.get("/expiring", assignmentController.getExpiringAssignments);
router.get("/:id", assignmentController.getAssignmentById);
router.put("/:id", assignmentController.updateAssignment);
router.delete("/:id", assignmentController.deleteAssignment);

router.post("/bulk-upload", upload.single("file"), bulkUploadAssignments);

router.get("/template/download", downloadSampleTemplate);

module.exports = router;
