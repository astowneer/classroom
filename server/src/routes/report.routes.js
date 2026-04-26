const router = require('express').Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Звіти перевірки
 */

router.use(authenticate);

/**
 * @swagger
 * /reports/assignment/{assignmentId}:
 *   get:
 *     summary: Таблиця результатів по всіх студентах завдання
 *     tags: [Reports]
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
 *                 type: object
 *                 properties:
 *                   submissionId:
 *                     type: integer
 *                   student:
 *                     type: object
 *                   status:
 *                     type: string
 *                   plagiarismScore:
 *                     type: string
 *                     example: "23.5%"
 *                   structurePassed:
 *                     type: boolean
 *                   sentToStudent:
 *                     type: boolean
 */
router.get('/assignment/:assignmentId', reportController.getByAssignment);

/**
 * @swagger
 * /reports/{submissionId}:
 *   get:
 *     summary: Детальний звіт (JSON)
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       404:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:submissionId', reportController.get);

/**
 * @swagger
 * /reports/{submissionId}/download:
 *   get:
 *     summary: Завантажити PDF звіт з виділеними запозиченнями
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: submissionId
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
router.get('/:submissionId/download', reportController.download);

module.exports = router;
