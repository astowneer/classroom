const { PlagiarismResult } = require('../models');

const SHINGLE_SIZE = 6;
const DOC_THRESHOLD = 0.15;
const SENT_THRESHOLD = 0.55;
const MIN_WORDS = 4;
const MIN_CHARS = 20;
const MIN_SEQ = 6; // min words in a common sequence for compareTexts

// ── Normalization ─────────────────────────────────────────────────────────────

function normalize(text) {
  return text
    .replace(/\u00AD/g, '')       // soft hyphens
    .replace(/-\n\s*/g, '')       // hyphenated line breaks
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

const BOILERPLATE_PATTERNS = [
  /навчальн\w+\s+рок/i,
  /лабораторн\w+\s+(?:робот|завдан)\w*\s+№?\d+/i,
  /варіант\s+№?\d+/i,
];

function removeBoilerplate(text) {
  return text.split('\n').filter(line => {
    const t = line.trim();
    if (!t || t.split(/\s+/).length <= 2) return false;
    return !BOILERPLATE_PATTERNS.some(p => p.test(t));
  }).join('\n');
}

// ── Tokenization ──────────────────────────────────────────────────────────────

function tokenizeWords(text) {
  return text.toLowerCase().replace(/[^\wа-яіїєґ\s]/gi, ' ').split(/\s+/).filter(Boolean);
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[А-ЯІЇЄҐA-Z])|(?<=[.!?])\s*\n+/)
    .flatMap(c => c.split(/\n{2,}/))
    .map(s => s.trim())
    .filter(s => s.length >= MIN_CHARS && tokenizeWords(s).length >= MIN_WORDS);
}

// ── Shingling ─────────────────────────────────────────────────────────────────

function buildShingles(words) {
  const s = new Set();
  for (let i = 0; i <= words.length - SHINGLE_SIZE; i++)
    s.add(words.slice(i, i + SHINGLE_SIZE).join(' '));
  return s;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter(x => b.has(x)).length;
  return inter / (a.size + b.size - inter);
}

// ── Sentence-level comparison (for DB plagiarism check) ───────────────────────

function findAllOccurrences(text, sub) {
  const res = [];
  let i = text.indexOf(sub);
  while (i !== -1) { res.push({ start: i, end: i + sub.length }); i = text.indexOf(sub, i + 1); }
  return res;
}

function findMatchingSentences(textA, textB) {
  const sentA = splitSentences(textA);
  const sentB = splitSentences(textB);
  const matchedA = new Set(); // stores indices, not text
  const matches = [];

  for (const sb of sentB) {
    const sbS = buildShingles(tokenizeWords(sb));
    if (!sbS.size) continue;
    let bestSim = 0, bestSa = null, bestIdx = -1;
    sentA.forEach((sa, idx) => {
      if (matchedA.has(idx)) return;
      const sim = jaccard(buildShingles(tokenizeWords(sa)), sbS);
      if (sim > bestSim) { bestSim = sim; bestSa = sa; bestIdx = idx; }
    });
    if (bestSim >= SENT_THRESHOLD && bestSa) {
      matchedA.add(bestIdx);
      const inA = findAllOccurrences(textA, bestSa);
      const inB = findAllOccurrences(textB, sb);
      if (inA.length && inB.length)
        matches.push({ textA: bestSa, textB: sb, similarity: +bestSim.toFixed(3), inA: inA[0], inB: inB[0], allInA: inA, allInB: inB });
    }
  }
  return matches;
}

// ── Word-sequence comparison (for visual compare tool) ────────────────────────

function findCharPos(originalText, words, wordStart, wordCount) {
  // Build regex that matches the words with any non-word chars between them
  const escaped = words.slice(wordStart, wordStart + wordCount)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(escaped.join('[^\\wа-яіїєґ]*'), 'i');
  const match = pattern.exec(originalText);
  if (!match) return null;
  return { start: match.index, end: match.index + match[0].length };
}

function findCommonSequences(textA, textB, wordsA, wordsB) {
  const index = new Map();
  for (let i = 0; i <= wordsA.length - MIN_SEQ; i++) {
    const key = wordsA.slice(i, i + MIN_SEQ).join('\x00');
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(i);
  }

  const matches = [];
  const usedA = new Set(), usedB = new Set();
  let i = 0;

  while (i <= wordsB.length - MIN_SEQ) {
    if (usedB.has(i)) { i++; continue; }
    const key = wordsB.slice(i, i + MIN_SEQ).join('\x00');
    if (!index.has(key)) { i++; continue; }

    let bestLen = 0, bestAStart = -1;
    for (const aStart of index.get(key)) {
      if (usedA.has(aStart)) continue;
      let len = MIN_SEQ;
      while (i + len < wordsB.length && aStart + len < wordsA.length && wordsA[aStart + len] === wordsB[i + len]) len++;
      if (len > bestLen) { bestLen = len; bestAStart = aStart; }
    }

    if (bestAStart === -1) { i++; continue; }

    for (let k = 0; k < bestLen; k++) { usedA.add(bestAStart + k); usedB.add(i + k); }

    const inA = findCharPos(textA, wordsA, bestAStart, bestLen);
    const inB = findCharPos(textB, wordsB, i, bestLen);

    if (inA && inB) {
      matches.push({
        textA: wordsA.slice(bestAStart, bestAStart + bestLen).join(' '),
        textB: wordsB.slice(i, i + bestLen).join(' '),
        wordCount: bestLen, inA, inB, allInA: [inA], allInB: [inB],
      });
    }
    i += bestLen;
  }
  return matches;
}

// ── Public API ────────────────────────────────────────────────────────────────

// ── Stop phrases ──────────────────────────────────────────────────────────────

function removeStopPhrases(text, stopPhrases) {
  if (!stopPhrases?.length) return text;
  let result = text;
  for (const phrase of stopPhrases) {
    if (!phrase.trim()) continue;
    const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), ' ');
  }
  return result;
}

exports.compareTexts = (textA, textB) => {
  const wA = tokenizeWords(normalize(textA));
  const wB = tokenizeWords(normalize(textB));
  const matches = findCommonSequences(textA, textB, wA, wB);
  const similarity = wB.length > 0
    ? matches.reduce((s, m) => s + m.wordCount, 0) / wB.length
    : 0;
  return { matches, similarity: +Math.min(similarity, 1).toFixed(3), matchCount: matches.length };
};

exports.compare = async (targetSubmission, earlierSubmissions, stopPhrases = []) => {
  const originalTarget = normalize(targetSubmission.extractedText);
  const targetText = removeStopPhrases(originalTarget, stopPhrases);
  const targetWords = tokenizeWords(targetText);
  const targetShingles = buildShingles(targetWords);
  const results = [];

  for (const source of earlierSubmissions) {
    const originalSource = normalize(source.extractedText);
    const sourceText = removeStopPhrases(originalSource, stopPhrases);
    const sourceWords = tokenizeWords(sourceText);

    const docSim = jaccard(targetShingles, buildShingles(sourceWords));

    const matches = docSim >= DOC_THRESHOLD
      ? findCommonSequences(sourceText, targetText, sourceWords, targetWords)
      : [];

    // Re-map inB positions from normalized text to original text
    const mappedMatches = matches.map(m => {
      const inBOriginal = findCharPosInOriginal(originalTarget, m.textB);
      return { ...m, inB: inBOriginal || m.inB, allInB: inBOriginal ? [inBOriginal] : m.allInB };
    });

    const similarity = targetWords.length > 0
      ? Math.min(matches.reduce((s, m) => s + m.wordCount, 0) / targetWords.length, 1)
      : 0;

    await PlagiarismResult.upsert({
      sourceSubmissionId: source.id,
      targetSubmissionId: targetSubmission.id,
      similarity: +similarity.toFixed(3),
      matches: mappedMatches,
    });

    if (mappedMatches.length) {
      results.push({
        sourceSubmissionId: source.id,
        similarity: +similarity.toFixed(3),
        matchCount: mappedMatches.length,
        matches: mappedMatches,
      });
    }
  }
  return results;
};

// Find position of normalized phrase in original (non-stop-phrase-removed) text
function findCharPosInOriginal(originalText, normalizedPhrase) {
  if (!normalizedPhrase) return null;
  const words = normalizedPhrase.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const pattern = new RegExp(
    words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^\\wа-яіїєґ]*'),
    'i'
  );
  const m = pattern.exec(originalText);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length };
}
