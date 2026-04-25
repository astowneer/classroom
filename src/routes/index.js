const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/courses', require('./course.routes'));
router.use('/assignments', require('./assignment.routes'));
router.use('/submissions', require('./submission.routes'));
router.use('/reports', require('./report.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/messages', require('./message.routes'));

module.exports = router;
