const express = require("express");
const router = express.Router();
const appraisalAnswerController = require("../../controllers/appraisal/appraisal-answer.controller");
const { verifyToken } = require("../../middleware/authMiddleware");
//create appraisal Answer
router.post('/', verifyToken, appraisalAnswerController.createAppraisalAnswer);
//get all appraisal Answer
router.get('/',verifyToken,  appraisalAnswerController.getAppraisalAnswers);
//download list
router.get('/download', verifyToken, appraisalAnswerController.getAppraisalAnswerDownload);
// by id Answer
router.get('/:id', verifyToken, appraisalAnswerController.getAppraisalAnswer);
// update appraisal Answer
router.put('/:id', verifyToken, appraisalAnswerController.updateAppraisalAnswer);
// status change
router.patch('/:id', verifyToken, appraisalAnswerController.onStatusChange);
module.exports = router