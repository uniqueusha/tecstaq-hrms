const express = require("express");
const router = express.Router();
const salaryStructureComponentsController = require("../controllers/salary-structure-components.controllers");
const { verifyToken } = require('../middleware/authMiddleware');


router.post('/', verifyToken, salaryStructureComponentsController.createSalaryStructureComponent);
router.get('/', salaryStructureComponentsController.getAllSalaryStructureComponents);
router.get('/wma', salaryStructureComponentsController.getSalaryStructureComponentsIdWma);
router.get('/:id', salaryStructureComponentsController.getSalaryStructureComponents);
router.put('/:id', salaryStructureComponentsController.updatesalaryStructureComponents);
router.patch('/:id',salaryStructureComponentsController.onStatusChange);

module.exports = router