const { PlagiarismResult } = require('../models');

// Splits text into sentences
function tokenize(text) {
  return text.match(/[^.!?\n]+[.!?\n]*/g) || [];
}

// Returns similarity ratio between two strings (Jaccard on words)
function similarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  return intersection / (setA.size + setB.size - intersection);
}

const THRESHOLD = 0.7;

/**
 * Compare targetSubmission against all earlier submissions (sorted by submittedAt).
 * Earlier submissions are considered originals.
 */
exports.compare = async (targetSubmission, earlierSubmissions) => {
  const targetSentences = tokenize(targetSubmission.extractedText);
  const matches = [];

  for (const source of earlierSubmissions) {
    const sourceSentences = tokenize(source.extractedText);
    const pairMatches = [];

    for (const ts of targetSentences) {
      for (const ss of sourceSentences) {
        if (similarity(ts, ss) >= THRESHOLD) {
          pairMatches.push({ targetText: ts.trim(), sourceText: ss.trim() });
        }
      }
    }

    if (pairMatches.length > 0) {
      const score = pairMatches.length / targetSentences.length;
      await PlagiarismResult.create({
        sourceSubmissionId: source.id,
        targetSubmissionId: targetSubmission.id,
        similarity: score,
        matches: pairMatches,
      });
      matches.push({ sourceSubmissionId: source.id, similarity: score, matches: pairMatches });
    }
  }

  return matches;
};
