const express = require("express");
const router = express.Router();
const timesheetController = require("../../controllers/master/timesheet.controller");
const { verifyToken } = require('../../middleware/authMiddleware');

//create work-category
router.post('/', verifyToken, timesheetController.createTimesheet);
//get all work-category
router.get('/', timesheetController.getAllTimesheet);
//download list
// router.get('/download', timesheetController.getWorkCategoryDownload);
//Active work-category
router.get('/wma', timesheetController.getTimesheetWma);
// by id work-category
router.get('/:id', timesheetController.getTimesheet);
// update work-category
router.put('/:id', timesheetController.updateTimesheet);
// change status work-category
router.patch('/:id', timesheetController.onStatusChange);

module.exports = router