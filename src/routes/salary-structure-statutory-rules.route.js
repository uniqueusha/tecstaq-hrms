const express = require("express");
const router = express.Router();
const salaryStructureRuleController = require("../controllers/salary-structure-statutory-rules.controller");
const { verifyToken } = require('../middleware/authMiddleware');


router.post('/', verifyToken, salaryStructureRuleController.createSalaryStructureStatutoryRules);
router.get('/', salaryStructureRuleController.getAllSalaryStructureStatutoryRules);
router.get('/wma', salaryStructureRuleController.getSalaryStructureStatutoryRulesIdWma);
router.get('/:id', salaryStructureRuleController.getSalaryStructureStatutoryRule);
router.put('/:id', salaryStructureRuleController.updateSalaryStructureStatutoryRules);
router.patch('/:id',salaryStructureRuleController.onStatusChange);

module.exports = router