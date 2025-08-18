const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { create_work_week_pattern } = require('./workweekpatern.controller');
const { listwork_week_pattern  } = require('./workweekpatern.controller');
const { getwork_week_patternById  } = require('./workweekpatern.controller');
const { updatework_week_pattern } = require('./workweekpatern.controller');
const { deletework_week_pattern } = require('./workweekpatern.controller');
const { work_week_patternDropdown } = require('./workweekpatern.controller');

// Creare New work_week_pattern
router.post('/',verifyToken, create_work_week_pattern);

// Get work_week_pattern list
router.get('/list', verifyToken, listwork_week_pattern);

// Dropdown work_week_pattern and get by id at dropdown
router.get('/dropdown', verifyToken, work_week_patternDropdown);

// Get work_week_pattern by id
router.get('/:id', verifyToken, getwork_week_patternById); 

// Put work_week_pattern update by id
router.put('/:id', verifyToken, updatework_week_pattern);

// Delete work_week_pattern update by id
router.delete('/:id', verifyToken, deletework_week_pattern);



module.exports = router;
