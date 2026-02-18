
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middleware/authMiddleware');
router.post("/upload",verifyToken, attendanceController.importAttendanceFromBase64);
router.post("/check-in", attendanceController.checkIn);
router.post("/check-out", attendanceController.checkOut);
router.get("/upload", attendanceController.getAttendanceUploadList);
router.get("/", attendanceController.getEmployeeAttendanceByEmployeeCode);

module.exports = router;