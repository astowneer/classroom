const multer = require('multer');

module.exports = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Файл занадто великий. Максимальний розмір — 20MB.' });
    }
    return res.status(400).json({ error: `Помилка завантаження файлу: ${err.message}` });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Запит занадто великий. Максимальний розмір — 10MB.' });
  }

  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
};
