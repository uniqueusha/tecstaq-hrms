const express = require("express");
const router = express.Router();
const appraisalController = require("../../controllers/appraisal/appraisal.controller");
const { verifyToken } = require("../../middleware/authMiddleware");
//create appraisal
router.post('/', verifyToken, appraisalController.createAppraisal);
//get all appraisal
router.get('/',verifyToken,  appraisalController.getAppraisals);
//download list
router.get('/download', verifyToken, appraisalController.getAppraisalDownload);
// by id appraisal
router.get('/:id', verifyToken, appraisalController.getAppraisal);
// update appraisal
router.put('/:id', verifyToken, appraisalController.updateAppraisal);
// status change
router.patch('/:id', verifyToken, appraisalController.onStatusChange);
module.exports = router