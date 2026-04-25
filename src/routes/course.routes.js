const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Курси Google Classroom
 */

router.use(authenticate);

/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Список курсів викладача
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Масив курсів
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
router.get('/', courseController.list);

/**
 * @swagger
 * /courses/sync:
 *   post:
 *     summary: Синхронізувати курси з Google Classroom
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Синхронізовані курси
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
router.post('/sync', authorize('teacher'), courseController.syncFromClassroom);

module.exports = router;
