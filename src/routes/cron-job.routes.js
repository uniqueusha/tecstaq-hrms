const express = require("express");
const router = express.Router();
const cronJobController = require('../controllers/cron-job.controller')
router.get('/auto-check-out', cronJobController.autoCheckOut);
router.get('/birth-email', cronJobController.empEmail);

module.exports = router