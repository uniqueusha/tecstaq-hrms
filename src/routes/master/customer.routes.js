const express = require("express");
const router = express.Router();
const customerController = require("../../controllers/master/customer.controller")
//create customer
router.post('/', customerController.createCustomer);
//get all customer
router.get('/', customerController.getAllCustomer);
//download list
router.get('/download', customerController.getCustomerDownload);
//Active customer
router.get('/wma', customerController.getCustomerWma);
// by id customer
router.get('/:id', customerController.getCustomer);
// update customer
router.put('/:id', customerController.updateCustomer);
// change status customer
router.patch('/:id', customerController.onStatusChange);

module.exports = router