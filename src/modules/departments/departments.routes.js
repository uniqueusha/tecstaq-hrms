const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createDepartments } = require('./departments.controller');
const { listDepartments  } = require('./departments.controller');
const { getDepartmentById  } = require('./departments.controller');
const { updateDepartments } = require('./departments.controller');
const { deleteDepartments } = require('./departments.controller');
const { departmentsDropdown } = require('./departments.controller');
const { onStatusChange } = require('./departments.controller')


// Creare New Deaprtments
router.post('/',verifyToken, createDepartments);

// Get Deaprtments list
router.get('/list', verifyToken, listDepartments);

// Dropdown Deaprtments and get by id at dropdown
router.get('/dropdown', verifyToken, departmentsDropdown);

// Get Deaprtment by id
router.get('/:id', verifyToken, getDepartmentById); 

// Put Deaprtments update by id
router.put('/:id', verifyToken, updateDepartments);

//patch status change
router.patch('/:id', onStatusChange )

// Delete Deaprtments update by id
router.delete('/:id', verifyToken, deleteDepartments);



module.exports = router;
