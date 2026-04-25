const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Управління користувачами
 */

router.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Список користувачів
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [teacher, student]
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 */
router.get('/', authorize('teacher'), userController.list);
router.get('/course/:courseId/students', authorize('teacher'), userController.listByCourse);

/**
 * @swagger
 * /users/{id}/name:
 *   patch:
 *     summary: Оновити ім'я студента вручну
 *     tags: [Users]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Дробідько Владислав Анатолійович
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 */
router.patch('/:id/name', authorize('teacher'), userController.updateName);

module.exports = router;
