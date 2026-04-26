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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 * /submissions/{id}/file:
 *   get:
 *     summary: Завантажити оригінальний PDF файл роботи
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF файл
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/file', submissionController.downloadFile);

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

/**
 * @swagger
 * /submissions/check-selected:
 *   post:
 *     summary: Перевірити вибрані роботи
 *     tags: [Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [submissionIds, assignmentId]
 *             properties:
 *               submissionIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               assignmentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Результати перевірки
 */
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
 *     summary: Студент завантажує роботу для самоперевірки
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
 *         description: Resubmission запис створено
 */
router.post('/:id/resubmit', authorize('student'), upload.single('file'), submissionController.resubmit);

/**
 * @swagger
 * /submissions/{id}/self-check:
 *   post:
 *     summary: Студент запускає самоперевірку (не впливає на результати викладача)
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Результат самоперевірки (зберігається тільки для студента)
 */
router.post('/:id/self-check', authorize('student'), submissionController.selfCheck);

module.exports = router;
