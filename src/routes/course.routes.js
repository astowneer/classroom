const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', courseController.list);
router.post('/sync', authorize('teacher'), courseController.syncFromClassroom);

module.exports = router;
