const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createshift_type } = require('./shift_type.controller');
const { listshift_type  } = require('./shift_type.controller');
const { getshift_typeById  } = require('./shift_type.controller');
const { updateshift_type } = require('./shift_type.controller');
const { deleteshift_type } = require('./shift_type.controller');
const { shift_typeDropdown } = require('./shift_type.controller');


// Creare New shift_type
router.post('/',verifyToken, createshift_type);

// Get shift_type list
router.get('/list', verifyToken, listshift_type);

// Dropdown shift_type and get by id at dropdown
router.get('/dropdown', verifyToken, shift_typeDropdown);

// Get shift_type by id
router.get('/:id', verifyToken, getshift_typeById); 

// Put shift_type update by id
router.put('/:id', verifyToken, updateshift_type);

// Delete shift_type update by id
router.delete('/:id', verifyToken, deleteshift_type);



module.exports = router;
