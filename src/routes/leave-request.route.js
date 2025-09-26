const express  = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leave-request.controller');

router.post('/',leaveRequestController.createLeaveRequest)
router.get('/',leaveRequestController.getLeaveRequests)
router.get('/:id',leaveRequestController.getLeaveRequest)
router.put('/:id',leaveRequestController.updateLeaveRequest)
router.patch('/:id', leaveRequestController.approveLeaveRequest)
module.exports = router