const router = require('express').Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/assignment/:assignmentId', reportController.getByAssignment);
router.get('/:submissionId', reportController.get);
router.get('/:submissionId/download', reportController.download);

module.exports = router;
