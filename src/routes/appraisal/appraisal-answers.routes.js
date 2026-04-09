const express = require("express");
const router = express.Router();
const appraisalController = require("../../controllers/appraisal/appraisal-answers.controller");
const { verifyToken } = require("../../middleware/authMiddleware");
//create appraisal answer
router.post('/', verifyToken, appraisalController.createAppraisalAnswer);
//get all appraisal answer
router.get('/',verifyToken,  appraisalController.getAppraisalAnswers);
//download list
router.get('/download', verifyToken, appraisalController.getAppraisalAnswerDownload);
// update appraisal answer
router.put('/:id', verifyToken, appraisalController.updateAppraisalAnswer);
module.exports = router