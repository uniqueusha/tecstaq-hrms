const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller')
router.post('/set-calendar',settingsController.setCalendar)
router.get('/',settingsController.getSettings)

module.exports = router