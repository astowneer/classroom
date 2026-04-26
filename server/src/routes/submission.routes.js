const router = require('express').Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);

router.get('/', submissionController.list);
router.get('/:id/file', submissionController.downloadFile);

router.post('/sync/:assignmentId', authorize('teacher'), submissionController.syncFromClassroom);
router.post('/check/:assignmentId', authorize('teacher'), submissionController.runChecks);
router.post('/check-selected', authorize('teacher'), submissionController.runChecksSelected);
router.post('/:id/notify', authorize('teacher'), submissionController.notifyStudent);

// Student: upload file for self-check only (does not affect teacher results)
router.post('/:id/resubmit', authorize('student'), upload.single('file'), submissionController.resubmit);
router.post('/:id/self-check', authorize('student'), submissionController.selfCheck);

module.exports = router;
