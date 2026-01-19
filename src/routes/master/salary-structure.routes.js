const express = require("express");
const router = express.Router();
const salaryStructureController = require("../../controllers/master/salary-structure.controller")
//create salary structure
router.post('/', salaryStructureController.createSalaryStructure);
//get all salary structure
router.get('/', salaryStructureController.getSalaryStructures);
//download salary structure
// router.get('/download', salaryStructureController.getSalaryStructureDownload);
//Active salary structure
router.get('/wma', salaryStructureController.getSalaryStructureWma);
// by id salary structure
router.get('/:id', salaryStructureController.getSalaryStructure);
// update salary structure
router.put('/:id', salaryStructureController.updateSalaryStructure);
// change status salary structure
router.patch('/:id', salaryStructureController.onStatusChange);

module.exports = router