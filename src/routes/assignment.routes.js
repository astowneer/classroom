const router = require('express').Router();
const assignmentController = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', assignmentController.list);
router.get('/:id', assignmentController.get);
router.put('/:id/structure', authorize('teacher'), assignmentController.updateStructureRequirements);

module.exports = router;
