const express = require("express");
const router = express.Router();
const calculationTypeController = require("../../controllers/master/calculation-type.controller")
//create calculation-type
router.post('/', calculationTypeController.createCalculationType);
//get all calculation-type
router.get('/', calculationTypeController.getCalculationTypes);
//download list
router.get('/download', calculationTypeController.getCalculationTypeDownload);
//Active calculation-type
router.get('/wma', calculationTypeController.getCalculationTypeWma);
// by id calculation-type
router.get('/:id', calculationTypeController.getCalculationType);
// update calculation-type
router.put('/:id', calculationTypeController.updateCalculationType);
// change status calculation-type
router.patch('/:id', calculationTypeController.onStatusChange);

module.exports = router