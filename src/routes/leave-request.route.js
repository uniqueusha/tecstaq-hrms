const express  = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leave-request.controller');

router.post('/',leaveRequestController.createLeaveRequest)
router.get('/',leaveRequestController.getLeaveRequests)
router.get('/employe-leave-balance',leaveRequestController.getLeaveBalances)
router.get('/employee-leave-type/:id',leaveRequestController.getEmployeeLeaveTypes)
router.get('/:id',leaveRequestController.getLeaveRequest)
router.put('/:id',leaveRequestController.updateLeaveRequest)
router.patch('/:id', leaveRequestController.approveLeaveRequest)
router.delete('/leave-request-footer/:id', leaveRequestController.deleteLeaveRequestFooter)
module.exports = router