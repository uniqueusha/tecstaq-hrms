const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/download', userController.getUserDownload);
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);

module.exports = router