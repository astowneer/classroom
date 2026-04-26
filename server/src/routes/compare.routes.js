const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const pdfService = require('../services/pdf.service');
const plagiarismService = require('../services/plagiarism.service');

router.use(authenticate, authorize('teacher'));

// POST /compare/extract — extract text from uploaded PDF
router.post('/extract', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF required' });
    const text = await pdfService.extractFromLocalFile(req.file.path);
    res.json({ text });
  } catch (err) { next(err); }
});

// POST /compare — compare two texts and return matches with indices
const MAX_TEXT_SIZE = 500_000; // 500KB of text

router.post('/', async (req, res, next) => {
  try {
    const { textA, textB } = req.body;
    if (!textA || !textB) return res.status(400).json({ error: 'textA and textB required' });

    if (textA.length > MAX_TEXT_SIZE || textB.length > MAX_TEXT_SIZE) {
      return res.status(413).json({
        error: `Текст занадто великий. Максимальний розмір — ${MAX_TEXT_SIZE / 1000}KB. Спробуйте скоротити текст або порівнювати частинами.`,
      });
    }

    const result = plagiarismService.compareTexts(textA, textB);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
