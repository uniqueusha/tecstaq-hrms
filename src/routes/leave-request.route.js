const express  = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leave-request.controller');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, leaveRequestController.createLeaveRequest)
router.get('/', verifyToken, leaveRequestController.getLeaveRequests)
router.get('/employe-leave-balance', verifyToken, leaveRequestController.getLeaveBalances)
router.get('/download', verifyToken, leaveRequestController.getLeaveRequestsDownload)
router.get('/employee-leave-type/:id',verifyToken, leaveRequestController.getEmployeeLeaveTypes)
router.get('/:id',verifyToken, leaveRequestController.getLeaveRequest)
router.put('/:id',verifyToken, leaveRequestController.updateLeaveRequest)
router.patch('/:id', verifyToken, leaveRequestController.approveLeaveRequest)
router.delete('/leave-request-footer/:id', verifyToken, leaveRequestController.deleteLeaveRequestFooter)
module.exports = router