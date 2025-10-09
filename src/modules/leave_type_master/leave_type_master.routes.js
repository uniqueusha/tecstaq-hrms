const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createleave_type_master } = require('./leave_type_master.controller');
const { getLeaveType  } = require('./leave_type_master.controller');
const { getLeaveTypeMasterById  } = require('./leave_type_master.controller');
const { updateleave_type_master } = require('./leave_type_master.controller');
const { deleteleave_type_master } = require('./leave_type_master.controller');
const { leave_type_masterDropdown } = require('./leave_type_master.controller');
const { onStatusChange } = require('./leave_type_master.controller')

// Creare New leave_type_masterDropdown
router.post('/',verifyToken, createleave_type_master);

// Get leave_type_masterDropdown list
router.get('/list', verifyToken, getLeaveType);

// Dropdown leave_type_masterDropdown and get by id at dropdown
router.get('/dropdown', verifyToken, leave_type_masterDropdown);

// Get Deaprtment by id
router.get('/:id', verifyToken, getLeaveTypeMasterById); 

// Put leave_type_masterDropdown update by id
router.put('/:id', verifyToken, updateleave_type_master);

//patch status change
router.patch('/:id', onStatusChange);

// Delete leave_type_masterDropdown update by id
router.delete('/:id', verifyToken, deleteleave_type_master);


module.exports = router;
