const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const pdfService = require('../services/pdf.service');
const plagiarismService = require('../services/plagiarism.service');

/**
 * @swagger
 * tags:
 *   name: Compare
 *   description: Ручне порівняння текстів на запозичення
 */

router.use(authenticate, authorize('teacher'));

/**
 * @swagger
 * /compare/extract:
 *   post:
 *     summary: Витягти текст з PDF для порівняння
 *     tags: [Compare]
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
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 */
router.post('/extract', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    const text = await pdfService.extractFromLocalFile(req.file.path);
    res.json({ text });
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /compare:
 *   post:
 *     summary: Порівняти два тексти і знайти збіги
 *     tags: [Compare]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [textA, textB]
 *             properties:
 *               textA:
 *                 type: string
 *                 description: Оригінальний текст
 *               textB:
 *                 type: string
 *                 description: Текст що перевіряється
 *     responses:
 *       200:
 *         description: Результат порівняння з позиціями збігів
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 similarity:
 *                   type: number
 *                 matchCount:
 *                   type: integer
 *                 matches:
 *                   type: array
 *       413:
 *         description: Текст занадто великий (>500KB)
 */
const MAX_TEXT_SIZE = 500_000;
router.post('/', async (req, res, next) => {
  try {
    const { textA, textB } = req.body;
    if (!textA || !textB) return res.status(400).json({ error: 'textA and textB required' });
    if (textA.length > MAX_TEXT_SIZE || textB.length > MAX_TEXT_SIZE) {
      return res.status(413).json({
        error: `Текст занадто великий. Максимальний розмір — ${MAX_TEXT_SIZE / 1000}KB.`,
      });
    }
    const result = plagiarismService.compareTexts(textA, textB);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
