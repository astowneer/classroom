const router = require('express').Router();
const authController = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Google OAuth автентифікація
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Редірект на Google OAuth
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [teacher, student]
 *           default: teacher
 *     responses:
 *       302:
 *         description: Редірект на Google
 */
router.get('/google', authController.googleAuth);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JWT токен та дані користувача
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Вихід
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Успішно
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Поточний користувач
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Дані поточного користувача
 */
router.get('/me', authController.me);

module.exports = router;
