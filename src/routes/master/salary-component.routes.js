const express = require("express");
const router = express.Router();
const salaryComponentController = require("../../controllers/master/salary-component.controller")
//create salary component
router.post('/', salaryComponentController.createSalaryComponent);
//get all salary component
router.get('/', salaryComponentController.getSalaryComponents);
//download list
// router.get('/download', SalaryComponentController.getGradeDownload);
//Active salary component
router.get('/wma', salaryComponentController.getSalaryComponentWma);
// by id salary component
router.get('/:id', salaryComponentController.getSalaryComponent);
// update salary component
router.put('/:id', salaryComponentController.updateSalaryComponent);
// change status salary component
router.patch('/:id', salaryComponentController.onStatusChange);

module.exports = router