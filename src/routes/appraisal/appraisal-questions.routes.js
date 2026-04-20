const express = require("express");
const router = express.Router();
const appraisalController = require("../../controllers/appraisal/appraisal-questions.controller");
const { verifyToken } = require("../../middleware/authMiddleware");
//create appraisal Question
router.post('/', verifyToken, appraisalController.createAppraisalQuestion);
//get all appraisal Question by appraisal cycle id
router.get('/question/:id',verifyToken,  appraisalController.getAppraisalQuestionsByAppraisalCycleId);
//get all appraisal Question
router.get('/',verifyToken,  appraisalController.getAppraisalQuestions);
//download list
router.get('/download', verifyToken, appraisalController.getAppraisalQuestionDownload);
// update appraisal Question
router.put('/:id', verifyToken, appraisalController.updateAppraisalQuestion);
// status change
router.patch('/:id', verifyToken, appraisalController.onStatusChange);
module.exports = router