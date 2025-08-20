const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middleware/authMiddleware');

const { createPolicy } = require("./policy.controller");
const { getAllPolicy } = require("./policy.controller");
const { getPolicy } = require("./policy.controller");
const { updatePolicy } = require("./policy.controller");
const { onStatusChange } = require("./policy.controller");
const { getPolicyWma } = require("./policy.controller");

// Create New policy
router.post('/',verifyToken, createPolicy);

// get all list policy
router.get('/', getAllPolicy);

//Active policy
router.get('/wma', getPolicyWma);

// by id  policy
router.get('/:id', getPolicy);

// update  policy
router.put('/:id', updatePolicy);

// change status policy
router.patch('/:id', onStatusChange);


module.exports = router
