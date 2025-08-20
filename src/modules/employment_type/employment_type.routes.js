const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createemployment_type} = require('./employment_type.controller');
const { listemployment_type  } = require('./employment_type.controller');
const { getemployment_typeById  } = require('./employment_type.controller');
const { updateemployment_type} = require('./employment_type.controller');
const { deleteemployment_type} = require('./employment_type.controller');
const { employment_typeDropdown } = require('./employment_type.controller');


// Creare New employment_type
router.post('/',verifyToken, createemployment_type);

// Get employment_typelist
router.get('/list', verifyToken, listemployment_type);

// Dropdown employment_typeand get by id at dropdown
router.get('/dropdown', verifyToken, employment_typeDropdown);

// Get employment_typeby id
router.get('/:id', verifyToken, getemployment_typeById); 

// Put employment_typeupdate by id
router.put('/:id', verifyToken, updateemployment_type);

// Delete employment_typeupdate by id
router.delete('/:id', verifyToken, deleteemployment_type);



module.exports = router;
