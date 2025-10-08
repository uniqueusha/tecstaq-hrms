const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createDesignation } = require('./designation.controller');
const { getDesignations  } = require('./designation.controller');
const { getDesignationById  } = require('./designation.controller');
const { updateDesignation } = require('./designation.controller');
const { deleteDesignation } = require('./designation.controller');
const { designationDropdown } = require('./designation.controller');
const { document_typeDropdown } = require('./designation.controller');
const { onStatusChange } = require('./designation.controller')

// Creare New Deaprtments
router.post('/',verifyToken, createDesignation);

// Get Deaprtments list
router.get('/list', verifyToken, getDesignations);

// Dropdown Deaprtments and get by id at dropdown
router.get('/dropdown', verifyToken, designationDropdown);

// Dropdown Document Type and get by id at dropdown
router.get('/dtdropdown', verifyToken, document_typeDropdown);


// Get Deaprtment by id
router.get('/:id', verifyToken, getDesignationById); 

// Put Deaprtments update by id
router.put('/:id', verifyToken, updateDesignation);

//patch designation status change
router.patch('/:id', onStatusChange)

// Delete Deaprtments update by id
router.delete('/:id', verifyToken, deleteDesignation);



module.exports = router;
