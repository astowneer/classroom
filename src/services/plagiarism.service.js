const { PlagiarismResult } = require('../models');

const SHINGLE_SIZE = 6;   // words per shingle
const THRESHOLD = 0.25;   // min Jaccard similarity to flag plagiarism

function tokenizeWords(text) {
  return text.toLowerCase().replace(/[^\wа-яіїєґ\s]/gi, '').split(/\s+/).filter(Boolean);
}

function buildShingles(words) {
  const shingles = new Set();
  for (let i = 0; i <= words.length - SHINGLE_SIZE; i++) {
    shingles.add(words.slice(i, i + SHINGLE_SIZE).join(' '));
  }
  return shingles;
}

function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0;
  const intersection = [...setA].filter(s => setB.has(s)).length;
  return intersection / (setA.size + setB.size - intersection);
}

// Find matching sentences between two texts
function findMatchingSentences(targetText, sourceText) {
  const targetSentences = targetText.match(/[^.!?\n]{20,}[.!?\n]*/g) || [];
  const sourceSentences = sourceText.match(/[^.!?\n]{20,}[.!?\n]*/g) || [];
  const matches = [];

  for (const ts of targetSentences) {
    const tsWords = tokenizeWords(ts);
    if (tsWords.length < 5) continue;

    for (const ss of sourceSentences) {
      const ssWords = tokenizeWords(ss);
      if (ssWords.length < 5) continue;

      const tsShingles = buildShingles(tsWords);
      const ssShingles = buildShingles(ssWords);
      const sim = jaccardSimilarity(tsShingles, ssShingles);

      if (sim >= 0.6) {
        matches.push({ targetText: ts.trim(), sourceText: ss.trim(), similarity: sim });
        break; // one match per target sentence is enough
      }
    }
  }

  return matches;
}

/**
 * Compare targetSubmission against all earlier (original) submissions.
 * Returns array of matches per source submission.
 */
exports.compare = async (targetSubmission, earlierSubmissions) => {
  const targetWords = tokenizeWords(targetSubmission.extractedText);
  const targetShingles = buildShingles(targetWords);
  const results = [];

  for (const source of earlierSubmissions) {
    const sourceWords = tokenizeWords(source.extractedText);
    const sourceShingles = buildShingles(sourceWords);

    const similarity = jaccardSimilarity(targetShingles, sourceShingles);
    if (similarity < THRESHOLD) continue;

    const matches = findMatchingSentences(targetSubmission.extractedText, source.extractedText);

    await PlagiarismResult.upsert({
      sourceSubmissionId: source.id,
      targetSubmissionId: targetSubmission.id,
      similarity,
      matches,
    });

    results.push({ sourceSubmissionId: source.id, similarity, matchCount: matches.length, matches });
  }

  return results;
};
