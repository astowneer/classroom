const router = require('express').Router();
const authController = require('../controllers/auth.controller');

router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

module.exports = router;
