const express = require('express');
const router = express.Router()
const regularizationController = require('../controllers/regularization.controller');
const { verifyToken } = require('../middleware/authMiddleware')
router.post('/',verifyToken, regularizationController.createRegularizationRequest)
router.get('/',verifyToken, regularizationController.getRegularizationRequests)
router.get('/download',verifyToken, regularizationController.getRegularizationRequestsDownload)
router.get('/:id',verifyToken, regularizationController.getRegularizationRequest)
router.put('/approve/:id',verifyToken, regularizationController.approveRegularizationRequest)
router.put('/:id',verifyToken, regularizationController.updateRegularizationRequest)

module.exports = router