const express = require('express');
const router = express.Router();
const payRollController = require('../controllers/pay-roll.controller')

router.post('/initialize',payRollController.payRollInitialize)
// //get employee salary component list
// router.get('',payRollController.getEmployeeSalaryComponent)
// //Active employee salary component
// router.get('/wma', payRollController.getEmployeeSalaryComponentWma);
// // by id employee salary component
// router.get('/:id', payRollController.getEmployeeSalaryComponentById);
// // update employee salary component
// router.put('/:id', payRollController.updateEmployeeSalaryComponent);
// // change status employee salary component
// router.patch('/:id', payRollController.onStatusChange);
module.exports= router