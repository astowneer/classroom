const { pipeline } = require('@xenova/transformers');

let extractor = null;

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

// Split text into overlapping chunks of ~1500 chars
function chunkText(text, size = 1500, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// Embed text as mean of all chunk embeddings
async function embedText(text, ext) {
  const chunks = chunkText(text.trim());
  const vecs = await Promise.all(
    chunks.map(chunk => ext(chunk, { pooling: 'mean', normalize: true }).then(o => Array.from(o.data)))
  );
  // Average all chunk vectors
  const dim = vecs[0].length;
  const mean = new Array(dim).fill(0);
  for (const v of vecs) for (let i = 0; i < dim; i++) mean[i] += v[i] / vecs.length;
  // Normalize
  const norm = Math.sqrt(mean.reduce((s, x) => s + x * x, 0));
  return mean.map(x => x / norm);
}

/**
 * Compare submission text against reference text (etalon or description).
 * Using chunked embeddings allows comparing full documents, not just first 2000 chars.
 */
exports.check = async (submissionText, referenceText) => {
  if (!referenceText || !submissionText) {
    return { score: null, label: 'Недостатньо даних для перевірки' };
  }

  const ext = await getExtractor();
  const [submissionVec, referenceVec] = await Promise.all([
    embedText(submissionText, ext),
    embedText(referenceText, ext),
  ]);

  const score = cosineSimilarity(submissionVec, referenceVec);

  let label;
  if (score >= 0.75)     label = 'Тема розкрита повністю';
  else if (score >= 0.55) label = 'Тема розкрита частково';
  else                    label = 'Тема не розкрита';

  return { score: parseFloat(score.toFixed(3)), label };
};
