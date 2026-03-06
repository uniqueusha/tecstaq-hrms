const express = require("express");
const router = express.Router();
const dropdownController = require('../controllers/dropdown-controller')
router.post('/', dropdownController.createDropdown)
router.get('/', dropdownController.getDropdowns);
router.get('/active', dropdownController.getDropdownActive);
router.get('/:id', dropdownController.getDropdown);
router.put('/:id', dropdownController.updateDropdown);
router.patch('/:id', dropdownController.onStatusChange);

module.exports = router