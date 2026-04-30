const express = require('express');
const router = express.Router();
const payRollController = require('../controllers/pay-roll.controller')
const { verifyToken } = require('../middleware/authMiddleware')
router.post('/initialize',verifyToken, payRollController.prInitialize)
//get pay roll batches 
router.get('',payRollController.getPrBatches)
// //Active employee salary component
// router.get('/wma', payRollController.getEmployeeSalaryComponentWma);
//get pay roll batch by id 
router.get('/:id', payRollController.getPrBatchById);
// // update employee salary component
// router.put('/:id', payRollController.updateEmployeeSalaryComponent);
// // change status employee salary component
// router.patch('/:id', payRollController.onStatusChange);
module.exports= router