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
router.post('/', async (req, res, next) => {
  try {
    const { textA, textB } = req.body;
    if (!textA || !textB) return res.status(400).json({ error: 'textA and textB required' });

    const result = plagiarismService.compareTexts(textA, textB);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
