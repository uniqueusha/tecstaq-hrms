const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { create_work_week_pattern } = require('./workweekpatern.controller');
const { getWorkWeek  } = require('./workweekpatern.controller');
const { getWorkWeekPatternById  } = require('./workweekpatern.controller');
const { updatework_week_pattern } = require('./workweekpatern.controller');
const { deletework_week_pattern } = require('./workweekpatern.controller');
const { work_week_patternDropdown } = require('./workweekpatern.controller');
const { onStatusChange } = require('./workweekpatern.controller');
const { getWorkWeekPatternDownload } = require('./workweekpatern.controller');

// Creare New work_week_pattern
router.post('/',verifyToken, create_work_week_pattern);

// Get work_week_pattern list
router.get('/list', verifyToken, getWorkWeek);

// Dropdown work_week_pattern and get by id at dropdown
router.get('/dropdown', verifyToken, work_week_patternDropdown);

//download list
router.get('/download', getWorkWeekPatternDownload);

// Get work_week_pattern by id
router.get('/:id', verifyToken, getWorkWeekPatternById); 

// Put work_week_pattern update by id
router.put('/:id', verifyToken, updatework_week_pattern);

//patch status change
router.patch('/:id', onStatusChange);

// Delete work_week_pattern update by id
router.delete('/:id', verifyToken, deletework_week_pattern);



module.exports = router;
