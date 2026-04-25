const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/courses', require('./course.routes'));
router.use('/assignments', require('./assignment.routes'));
router.use('/submissions', require('./submission.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
