const router = require('express').Router();
const submissionController = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

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
 *     summary: Список робіт (студент бачить тільки свої)
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
 *     summary: Запустити перевірку всіх робіт завдання
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
 */
router.post('/check/:assignmentId', authorize('teacher'), submissionController.runChecks);
router.post('/check-selected', authorize('teacher'), submissionController.runChecksSelected);

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

/**
 * @swagger
 * /submissions/{id}/resubmit:
 *   post:
 *     summary: Студент завантажує переробленну роботу (PDF)
 *     tags: [Submissions]
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
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 */
router.post('/:id/resubmit', authorize('student'), upload.single('file'), submissionController.resubmit);

/**
 * @swagger
 * /submissions/{id}/self-check:
 *   post:
 *     summary: Студент запускає самостійну перевірку завантаженої роботи
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Результат перевірки
 */
router.post('/:id/self-check', authorize('student'), submissionController.selfCheck);

/**
 * @swagger
 * /submissions/{id}/submit-review:
 *   post:
 *     summary: Студент надсилає роботу на розгляд викладачу
 *     tags: [Submissions]
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
 *               $ref: '#/components/schemas/Submission'
 */
router.post('/:id/submit-review', authorize('student'), submissionController.submitForReview);

/**
 * @swagger
 * /submissions/{id}/review:
 *   post:
 *     summary: Викладач приймає або відхиляє переробку
 *     tags: [Submissions]
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
 *             required: [decision]
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [accept, reject]
 *               comment:
 *                 type: string
 *                 example: Добре виправлено, запозичення усунуто
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 */
router.post('/:id/review', authorize('teacher'), submissionController.review);

module.exports = router;
