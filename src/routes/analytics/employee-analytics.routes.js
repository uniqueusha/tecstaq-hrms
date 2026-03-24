
const express = require('express');
const router = express.Router();
const emloyeeAnalyticController = require('../../controllers/analytics/employee-analytics.controller');
const { verifyToken } = require('../../middleware/authMiddleware');
router.get("/", emloyeeAnalyticController.getEmployeeAnalytics);

module.exports = router;