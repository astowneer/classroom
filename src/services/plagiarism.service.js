const { PlagiarismResult } = require('../models');

const SHINGLE_SIZE = 6;
const THRESHOLD = 0.25;
// Approximate lines to skip at the start (title page)
const TITLE_PAGE_LINES = 20;

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

// Skip title page boilerplate (first N non-empty lines)
function stripBoilerplate(text) {
  const lines = text.split('\n');
  let nonEmpty = 0;
  let i = 0;
  for (; i < lines.length; i++) {
    if (lines[i].trim()) nonEmpty++;
    if (nonEmpty >= TITLE_PAGE_LINES) break;
  }
  return lines.slice(i + 1).join('\n');
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .flatMap(chunk => chunk.split(/[.!?]+/).map(s => s.trim()))
    .filter(s => s.length > 15); // технічні тексти мають короткі рядки
}

function findMatchingSentences(targetText, sourceText) {
  const targetSentences = splitSentences(targetText);
  const sourceSentences = splitSentences(sourceText);
  const matches = [];

  for (const ts of targetSentences) {
    const tsWords = tokenizeWords(ts);
    if (tsWords.length < 4) continue;

    let best = null;
    for (const ss of sourceSentences) {
      const ssWords = tokenizeWords(ss);
      if (ssWords.length < 4) continue;

      const sim = jaccardSimilarity(buildShingles(tsWords), buildShingles(ssWords));
      if (sim >= 0.6 && (!best || sim > best.similarity)) {
        best = { targetText: ts.trim(), sourceText: ss.trim(), similarity: sim };
      }
    }
    if (best) {
      const start = targetText.indexOf(best.targetText);
      matches.push({
        ...best,
        start,
        end: start >= 0 ? start + best.targetText.length : -1,
      });
    }
  }

  return matches;
}

/**
 * Compare targetSubmission against all earlier (original) submissions.
 * Returns array of matches per source submission.
 */
exports.compare = async (targetSubmission, earlierSubmissions) => {
  const targetText = stripBoilerplate(targetSubmission.extractedText);
  const targetShingles = buildShingles(tokenizeWords(targetText));
  const results = [];

  for (const source of earlierSubmissions) {
    const sourceText = stripBoilerplate(source.extractedText);
    const sourceShingles = buildShingles(tokenizeWords(sourceText));

    const similarity = jaccardSimilarity(targetShingles, sourceShingles);
    if (similarity < THRESHOLD) continue;

    const matches = findMatchingSentences(targetText, sourceText);

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
