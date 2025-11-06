const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/authMiddleware');
const { createCompany } = require('./company.controller');
const { getCompanies  } = require('./company.controller');
const { getCompanyById  } = require('./company.controller');
const { updateCompany } = require('./company.controller');
const { deleteCompany } = require('./company.controller');
const { companyDropdown } = require('./company.controller');
const { onStatusChange } = require('./company.controller');
const { getCompanyDownload } = require('./company.controller');

// Creare New Company
router.post('/',verifyToken, createCompany);

// Get company list
router.get('/list', verifyToken, getCompanies);

// Dropdown company and get by id at dropdown
router.get('/dropdown', verifyToken, companyDropdown);

//download list
router.get('/download', getCompanyDownload);

// Get company by id
router.get('/:id', verifyToken, getCompanyById); 

// Put company update by id
router.put('/:id', verifyToken, updateCompany);

//status changes
router.patch('/:id', verifyToken, onStatusChange)

// Delete company update by id
router.delete('/:id', verifyToken, deleteCompany);



module.exports = router;
