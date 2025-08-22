const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middleware/authMiddleware');

const { createEmployee } = require("./employee.controller");
const { getEmployees } = require("./employee.controller");
const { getEmployee } = require("./employee.controller");
const { updateEmployee } = require("./employee.controller");
// const { onStatusChange } = require("./policy.controller");
// const { getPolicyWma } = require("./policy.controller");

// Create New employee
router.post('/',verifyToken, createEmployee);

// get all list employee
router.get('/', getEmployees);

// //Active policy
// router.get('/wma', getPolicyWma);

// by id employee
router.get('/:id', getEmployee);

// update employee
router.put('/:id', updateEmployee);

// // change status policy
// router.patch('/:id', onStatusChange);


module.exports = router
