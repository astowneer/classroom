const { pipeline } = require('@xenova/transformers');

let extractor = null;

// Lazy-load model on first use (downloads ~90MB once, cached locally)
async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline(
      'feature-extraction',
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
    );
  }
  return extractor;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embed(text, extractor) {
  // Truncate to 512 tokens worth of text (~2000 chars)
  const truncated = text.slice(0, 2000);
  const output = await extractor(truncated, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Check how well the submission covers the assignment topic.
 * @param {string} submissionText - extracted text from student work
 * @param {string} assignmentDescription - assignment title + description
 * @returns {{ score: number, label: string }}
 */
exports.check = async (submissionText, assignmentDescription) => {
  if (!assignmentDescription || !submissionText) {
    return { score: null, label: 'Недостатньо даних для перевірки' };
  }

  const ext = await getExtractor();
  const [submissionVec, assignmentVec] = await Promise.all([
    embed(submissionText, ext),
    embed(assignmentDescription, ext),
  ]);

  const score = cosineSimilarity(submissionVec, assignmentVec);

  let label;
  if (score >= 0.7)      label = 'Тема розкрита повністю';
  else if (score >= 0.5) label = 'Тема розкрита частково';
  else                   label = 'Тема не розкрита';

  return { score: parseFloat(score.toFixed(3)), label };
};
