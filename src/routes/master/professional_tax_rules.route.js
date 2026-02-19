const express = require("express");
const router = express.Router();
const ProfessionalTaxRuleController = require("../../controllers/master/professional-tax-rules.controller");
const { verifyToken } = require('../../middleware/authMiddleware');


router.post('/', verifyToken, ProfessionalTaxRuleController.createProfessionalTaxRules);
router.get('/', ProfessionalTaxRuleController.getAllProfessionalTaxRules);
router.get('/wma', ProfessionalTaxRuleController.getProfessionalTaxRulesIdWma);
router.get('/download', ProfessionalTaxRuleController.getProvidentFundRulesDownload);
router.get('/:id', ProfessionalTaxRuleController.getprofessionalTaxRule);
router.put('/:id', ProfessionalTaxRuleController.updateProfessionalTaxRules);
router.patch('/:id',ProfessionalTaxRuleController.onStatusChange);

module.exports = router