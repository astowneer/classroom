const router = require('express').Router();
const assignmentController = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Завдання курсів
 */

router.use(authenticate);

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Список завдань
 *     tags: [Assignments]
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Фільтр по курсу
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 */
router.get('/', assignmentController.list);

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Отримати завдання
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', assignmentController.get);

/**
 * @swagger
 * /assignments/sync/{courseId}:
 *   post:
 *     summary: Синхронізувати завдання курсу з Google Classroom
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 */
router.post('/sync/:courseId', authorize('teacher'), assignmentController.syncFromClassroom);

/**
 * @swagger
 * /assignments/{id}/structure:
 *   put:
 *     summary: Задати вимоги до структури роботи
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sections:
 *                 type: array
 *                 items:
 *                   oneOf:
 *                     - type: string
 *                     - type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         aliases:
 *                           type: array
 *                           items:
 *                             type: string
 *                         required:
 *                           type: boolean
 *                           default: true
 *                         forbidden:
 *                           type: boolean
 *                           default: false
 *                         minWords:
 *                           type: integer
 *           example:
 *             sections:
 *               - name: Вступ
 *                 required: true
 *                 minWords: 50
 *               - name: Висновок
 *                 aliases: [Висновки]
 *                 minWords: 30
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/structure', authorize('teacher'), assignmentController.updateStructureRequirements);
router.put('/:id/description', authorize('teacher'), assignmentController.updateDescription);
router.put('/:id/settings', authorize('teacher'), assignmentController.updateSettings);
router.post('/:id/reference', authorize('teacher'), upload.single('file'), assignmentController.uploadReference);

module.exports = router;
