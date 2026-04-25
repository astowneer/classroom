const router = require('express').Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', submissionController.list);
router.post('/sync/:assignmentId', authorize('teacher'), submissionController.syncFromClassroom);
router.post('/check/:assignmentId', authorize('teacher'), submissionController.runChecks);
router.post('/:id/notify', authorize('teacher'), submissionController.notifyStudent);

module.exports = router;
