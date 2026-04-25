const router = require('express').Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Здані роботи студентів
 */

router.use(authenticate);

/**
 * @swagger
 * /submissions:
 *   get:
 *     summary: Список робіт
 *     tags: [Submissions]
 *     parameters:
 *       - in: query
 *         name: assignmentId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 */
router.get('/', submissionController.list);

/**
 * @swagger
 * /submissions/sync/{assignmentId}:
 *   post:
 *     summary: Синхронізувати здані роботи з Google Classroom
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
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
 *                 $ref: '#/components/schemas/Submission'
 */
router.post('/sync/:assignmentId', authorize('teacher'), submissionController.syncFromClassroom);

/**
 * @swagger
 * /submissions/check/{assignmentId}:
 *   post:
 *     summary: Запустити перевірку всіх робіт завдання (витяг тексту, запозичення, структура)
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Результати перевірки
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   submissionId:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   report:
 *                     $ref: '#/components/schemas/Report'
 */
router.post('/check/:assignmentId', authorize('teacher'), submissionController.runChecks);

/**
 * @swagger
 * /submissions/{id}/notify:
 *   post:
 *     summary: Надіслати сповіщення студенту
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: submission id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: Ваша робота містить запозичення. Будь ласка, перездайте.
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.post('/:id/notify', authorize('teacher'), submissionController.notifyStudent);

module.exports = router;
