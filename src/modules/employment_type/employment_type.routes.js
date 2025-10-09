const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createemployment_type} = require('./employment_type.controller');
const { getEmploymentType  } = require('./employment_type.controller');
const { getEmploymentTypeById  } = require('./employment_type.controller');
const { updateemployment_type} = require('./employment_type.controller');
const { deleteemployment_type} = require('./employment_type.controller');
const { employment_typeDropdown } = require('./employment_type.controller');
const { onStatusChange } = require('./employment_type.controller');
const { getEmploymentTypeDownload } = require('./employment_type.controller');


// Creare New employment_type
router.post('/',verifyToken, createemployment_type);

// Get employment_typelist
router.get('/list', verifyToken, getEmploymentType);

// Dropdown employment_typeand get by id at dropdown
router.get('/dropdown', verifyToken, employment_typeDropdown);

//download list
router.get('/download', getEmploymentTypeDownload);

// Get employment_typeby id
router.get('/:id', verifyToken, getEmploymentTypeById); 

// Put employment_typeupdate by id
router.put('/:id', verifyToken, updateemployment_type);

//patch status change 
router.patch('/:id', onStatusChange);
// Delete employment_typeupdate by id
router.delete('/:id', verifyToken, deleteemployment_type);



module.exports = router;
