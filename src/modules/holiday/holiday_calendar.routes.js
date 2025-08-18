const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createholiday_calendar } = require('./holiday_calendar.controller');
const { listholiday_calendar  } = require('./holiday_calendar.controller');
const { list_with_details_holiday_calendar  } = require('./holiday_calendar.controller');
const { getholiday_calendarById  } = require('./holiday_calendar.controller');
const { updateHolidayCalendar } = require('./holiday_calendar.controller');
const { deleteholiday_calendar } = require('./holiday_calendar.controller');
const { holiday_calendarDropdown } = require('./holiday_calendar.controller');


// Creare New  holiday_calenda
router.post('/',verifyToken, createholiday_calendar);

// Get  holiday_calenda list
router.get('/list', verifyToken, listholiday_calendar);

// Get  list_with_details_holiday_calendarr list
router.get('/with-details/:id/', verifyToken, list_with_details_holiday_calendar);


// Dropdown  holiday_calenda and get by id at dropdown
router.get('/dropdown', verifyToken, holiday_calendarDropdown);

// Get  holiday_calenda by id
router.get('/:id', verifyToken, getholiday_calendarById); 

// Put  holiday_calenda update by id
router.put('/:id', verifyToken, updateHolidayCalendar);

// Delete  holiday_calenda update by id
router.delete('/:id', verifyToken, deleteholiday_calendar);



module.exports = router;
