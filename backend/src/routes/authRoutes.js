const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/users', authController.getUsers);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/me', authController.getCurrentUser);

module.exports = router;
