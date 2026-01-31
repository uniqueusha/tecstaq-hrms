const express = require('express');
const router = express.Router();
const employeeSalaryMappingController = require('../controllers/employee-salary-mapping.controller')

router.post('',employeeSalaryMappingController.createEmployeeSalaryMapping)
router.get('',employeeSalaryMappingController.getEmployeeSalaryMapping)
module.exports= router