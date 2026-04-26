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

/**
 * @swagger
 * /assignments/{id}/description:
 *   put:
 *     summary: Оновити опис завдання (використовується для перевірки повноти теми)
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/description', authorize('teacher'), assignmentController.updateDescription);

/**
 * @swagger
 * /assignments/{id}/settings:
 *   put:
 *     summary: Оновити налаштування завдання (мінімум символів тощо)
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
 *               minTextLength:
 *                 type: integer
 *                 example: 500
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/settings', authorize('teacher'), assignmentController.updateSettings);

/**
 * @swagger
 * /assignments/{id}/grading:
 *   put:
 *     summary: Налаштувати критерії оцінювання
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
 *           example:
 *             plagiarism:
 *               max: 4
 *               thresholds:
 *                 - limit: 0.1
 *                   score: 4
 *                 - limit: 0.3
 *                   score: 2
 *                 - limit: 1
 *                   score: 0
 *             structure:
 *               max: 3
 *             completeness:
 *               max: 2
 *             grammar:
 *               max: 1
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/grading', authorize('teacher'), assignmentController.updateGrading);

/**
 * @swagger
 * /assignments/{id}/stop-phrases:
 *   put:
 *     summary: Задати фрази що ігноруються при перевірці запозичень
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
 *               phrases:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Лабораторна робота", "Мета роботи", "Висновок"]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/stop-phrases', authorize('teacher'), assignmentController.updateStopPhrases);

/**
 * @swagger
 * /assignments/{id}/extract-fields:
 *   put:
 *     summary: Задати поля для витягування з тексту роботи (варіант, ПІБ тощо)
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
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                       example: Варіант
 *                     pattern:
 *                       type: string
 *                       example: "варіант\\s*(\\d+)"
 *                     maxLength:
 *                       type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 */
router.put('/:id/extract-fields', authorize('teacher'), assignmentController.updateExtractFields);

/**
 * @swagger
 * /assignments/{id}/reference:
 *   post:
 *     summary: Завантажити еталонну роботу для автоматичного налаштування вимог
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               sections:
 *                 type: string
 *                 description: JSON масив розділів
 *     responses:
 *       200:
 *         description: Автоматично розраховані мінімуми
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 minTextLength:
 *                   type: integer
 *                 totalChars:
 *                   type: integer
 *                 updatedSections:
 *                   type: array
 */
router.post('/:id/reference', authorize('teacher'), upload.single('file'), assignmentController.uploadReference);

module.exports = router;
