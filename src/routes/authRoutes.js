const express = require('express');
const router = express.Router();
const { login, logout, protectedRoute } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post("/logout", logout);

module.exports = router;
