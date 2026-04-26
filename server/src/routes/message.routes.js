const router = require('express').Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Чат між студентом і викладачем по роботі
 */

router.use(authenticate);

/**
 * @swagger
 * /messages/unread:
 *   get:
 *     summary: Кількість непрочитаних повідомлень по кожній роботі
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Масив { submissionId, count }
 */
router.get('/unread', messageController.unreadCount);

/**
 * @swagger
 * /messages/{submissionId}:
 *   get:
 *     summary: Отримати чат по роботі
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Масив повідомлень
 */
router.get('/:submissionId', messageController.list);

/**
 * @swagger
 * /messages/{submissionId}:
 *   post:
 *     summary: Надіслати повідомлення
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Надіслане повідомлення
 */
router.post('/:submissionId', messageController.send);

module.exports = router;
