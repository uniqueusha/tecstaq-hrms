const express = require("express");
const router = express.Router();
const ProvidentFundRuleController = require("../../controllers/master/provident-fund-rules.controller");
const { verifyToken } = require('../../middleware/authMiddleware');


router.post('/', ProvidentFundRuleController.createProvidentFundRule);
router.get('/', ProvidentFundRuleController.getAllProvidentFundRules);
router.get('/wma', ProvidentFundRuleController.getProvidentFundRulesIdWma);
router.get('/:id', ProvidentFundRuleController.getProvidentFundRule);
router.put('/:id', ProvidentFundRuleController.updateProvidentFundRule);
router.patch('/:id',ProvidentFundRuleController.onStatusChange);

module.exports = router