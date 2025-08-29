const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middleware/authMiddleware');

const { createEmployee } = require("./employee.controller");
const { getEmployees } = require("./employee.controller");
const { getEmployee } = require("./employee.controller");
const { updateEmployee } = require("./employee.controller");
const { onStatusChange } = require("./employee.controller");
const { getEmployeeWma } = require("./employee.controller");

// Create New employee
router.post('/',verifyToken, createEmployee);

// get all list employee
router.get('/', getEmployees);

//Active employee
router.get('/wma', getEmployeeWma);

// by id employee
router.get('/:id', getEmployee);

// update employee
router.put('/:id', updateEmployee);

// change status employee
router.patch('/:id', onStatusChange);


module.exports = router
