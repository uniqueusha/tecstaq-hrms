const express = require('express');
const router = express.Router();
const employeeSalaryMappingController = require('../controllers/employee-salary-mapping.controller')

router.post('',employeeSalaryMappingController.createEmployeeSalaryMapping)
//get employee salary mapping list
router.get('',employeeSalaryMappingController.getEmployeeSalaryMapping)
//Active employee salary mapping
router.get('/wma', employeeSalaryMappingController.getEmployeeSalaryMappingWma);
// by id employee salary mapping
router.get('/:id', employeeSalaryMappingController.getEmployeeSalaryMappingById);
// update employee salary mapping
router.put('/:id', employeeSalaryMappingController.updateEmployeeSalaryMapping);
// change status employee salary mapping
router.patch('/:id', employeeSalaryMappingController.onStatusChange);
module.exports= router