const express = require("express");
const router = express.Router();
const appraisalCycleController = require("../../controllers/appraisal/appraisal-cycle.controller");
const { verifyToken } = require("../../middleware/authMiddleware");
//create appraisal-cycle
router.post('/', verifyToken, appraisalCycleController.createAppraisalCycle);
//get all appraisal-cycle
router.get('/',verifyToken,  appraisalCycleController.getAppraisalCycles);
//download list
router.get('/download', verifyToken, appraisalCycleController.getAppraisalCycleDownload);
//get appraisal cycle with employee id
router.get('/employee/:id', verifyToken, appraisalCycleController.getAppraisalCycleWithEmployeeId)
// by id appraisal-cycle
router.get('/:id', verifyToken, appraisalCycleController.getAppraisalCycle);
// update appraisal-cycle
router.put('/:id', verifyToken, appraisalCycleController.updateAppraisalCycle);
// status change
router.patch('/:id', verifyToken, appraisalCycleController.onStatusChange);
module.exports = router