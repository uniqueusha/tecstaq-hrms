const express = require("express");
const router = express.Router();
const esiRuleController = require("../../controllers/master/esi-rules.controller")
//create esi rule
router.post('/', esiRuleController.createEsiRule);
//get all esi rule
router.get('/', esiRuleController.getEsiRules);
//download list
// router.get('/download', componentTypeController.getGradeDownload);
//Active esi rule
router.get('/wma', esiRuleController.getEsiRuleWma);
// by id esi rule
router.get('/:id', esiRuleController.getEsiRule);
// update esi rule
router.put('/:id', esiRuleController.updateEsiRule);
// change status esi rule
router.patch('/:id', esiRuleController.onStatusChange);

module.exports = router