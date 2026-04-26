const router = require('express').Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Сповіщення студентів
 */

router.use(authenticate);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Список сповіщень поточного користувача
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 */
router.get('/', notificationController.list);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Позначити сповіщення як прочитане
 *     tags: [Notifications]
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
