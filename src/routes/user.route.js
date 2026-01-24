const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/download', userController.getUserDownload);
router.get('/state', userController.getStateList);
router.get('/:id', userController.getUser);
router.put('/change-password',userController.onChangePassword);

router.put('/:id', userController.updateUser);
router.post('/send-otp',userController.sendOtp);
router.post('/verify-otp',userController.verifyOtp);
router.post('/check-emailid',userController.checkEmailId);
router.post('/forgot-Password',userController.forgotPassword);
router.post('/send-otp-if-email-not-exists',userController.sendOtpIfEmailIdNotExists);

module.exports = router