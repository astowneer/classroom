const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', authorize('teacher'), userController.list);
router.patch('/:id/name', authorize('teacher'), userController.updateName);

module.exports = router;
