const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { auth } = require('../../middleware/auth.middleware');

router.post('/login', authController.login);
router.post('/me', auth, authController.getMe);

module.exports = router;
