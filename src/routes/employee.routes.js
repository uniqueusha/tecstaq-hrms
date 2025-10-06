const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const employeeController = require("../controllers/employee.controller")

// Create New employee
router.post('/', employeeController.createEmployee);

// get all list employee
router.get('/', employeeController.getEmployees);

//Active employee
router.get('/wma', employeeController.getEmployeeWma);
//admin employee
router.get('/admin/wma', employeeController.getEmployeeAdminWma);

// by id employee
router.get('/:id', employeeController.getEmployee);

// update employee
router.put('/:id', employeeController.updateEmployee);

// change status employee
router.patch('/:id', employeeController.onStatusChange);


module.exports = router
