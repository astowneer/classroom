const MIN_WORDS = 4;
const MIN_CHARS = 20;

const BOILERPLATE_PATTERNS = [
  /навчальн\w+\s+рок/i,
  /лабораторн\w+\s+(?:робот|завдан)\w*\s+№?\d+/i,
  /варіант\s+№?\d+/i,
];

function normalize(text) {
  if (!text) return '';
  return text
    .replace(/\u00AD/g, '')
    .replace(/-\n\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function removeBoilerplate(text) {
  return text.split('\n').filter(line => {
    const t = line.trim();
    if (!t || t.split(/\s+/).length <= 2) return false;
    return !BOILERPLATE_PATTERNS.some(p => p.test(t));
  }).join('\n');
}

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

function buildShingles(words) {
  const SHINGLE_SIZE = 6;
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

module.exports = {
  MIN_WORDS,
  MIN_CHARS,
  normalize,
  removeBoilerplate,
  tokenizeWords,
  splitSentences,
  removeStopPhrases,
  buildShingles,
  jaccard,
};
