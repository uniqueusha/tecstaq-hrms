const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/authMiddleware');
const employeeController = require("../controllers/employee.controller")

// Create New employee
router.post('/', employeeController.createEmployee);

// get all list employee
router.get('/', employeeController.getEmployees);

//download list
router.get('/download', employeeController.getEmployeeDownload);

//Active employee
router.get('/wma', employeeController.getEmployeeWma);
//get upcoming leave
router.get('/upcoming-leave', employeeController.getUpcomingLeaves);
//admin employee
router.get('/admin/wma', employeeController.getEmployeeAdminWma);

// by id employee
router.get('/:id', employeeController.getEmployee);

// update employee
router.put('/:id', employeeController.updateEmployee);

// change status employee
router.patch('/:id', employeeController.onStatusChange);

//delete  employee document
router.delete('/employee-document/:id', employeeController.deleteEmployeeDocumentById)
//delete  employee education document
router.delete('/employee-education-document/:id', employeeController.deleteEmployeeEductionDocumentById)
//delete  employee previous company document
router.delete('/employee-previous-company-document/:id', employeeController.deleteEmployeePreviousCompanyDocumentById)
//delete  employee statutory document
router.delete('/employee-statutory-document/:id', employeeController.deleteEmployeeStatutoryDocumentById)
//delete  employee bank document
router.delete('/employee-bank-document/:id', employeeController.deleteEmployeeBankDocumentById)

module.exports = router
