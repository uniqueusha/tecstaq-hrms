
const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middleware/authMiddleware');
router.post("/upload",verifyToken, attendanceController.importAttendanceFromBase64);
router.post('/upload-manual', verifyToken, attendanceController.importAttendanceManual)
router.post("/check-in", attendanceController.checkIn);
router.post("/check-out", attendanceController.checkOut);
router.get("/checkin-status", verifyToken, attendanceController.checkinStatus);
router.get("/upload", attendanceController.getAttendanceUploadList);
router.get('/upload-download', attendanceController.getAttendanceUploadDownload);
router.get('/upload-manual', verifyToken, attendanceController.getAttendanceUploadManualList);
router.get('/upload-manual-download', verifyToken, attendanceController.getAttendanceUploadManualDownload);
router.get("/", attendanceController.getEmployeeAttendanceByEmployeeCode);
router.get('/all-attendance-download', attendanceController.getAllAttendanceDownload);
router.get('/monthly', attendanceController.getAllMonthlyAttendances)
router.get('/monthly/download', attendanceController.getAllMonthlyAttendancesDownload)

module.exports = router;