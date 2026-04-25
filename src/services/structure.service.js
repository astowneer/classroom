const { distance } = require('fastest-levenshtein');

// Max edit distance ratio to consider a heading a fuzzy match (0.2 = 20% of name length)
const FUZZY_RATIO = 0.25;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDisplayName(s) { return typeof s === 'object' ? s.name : s; }
function getNames(s)       { return typeof s === 'object' ? [s.name, ...(s.aliases || [])] : [s]; }
function isRequired(s)     { return typeof s === 'object' ? s.required !== false : true; }
function isForbidden(s)    { return typeof s === 'object' && s.forbidden === true; }
function getMinWords(s)    { return (typeof s === 'object' && s.minWords) || 0; }

// Exact heading match (with optional leading number)
function exactMatch(line, names) {
  return names.some(name =>
    new RegExp(`^(\\d+[.)\\s]+)?${escapeRegex(name)}\\s*$`, 'i').test(line)
  );
}

// Fuzzy heading match using Levenshtein
function fuzzyMatch(line, names) {
  const clean = line.replace(/^\d+[.)\s]+/, '').trim().toLowerCase();
  return names.some(name => {
    const threshold = Math.ceil(name.length * FUZZY_RATIO);
    return distance(clean, name.toLowerCase()) <= threshold;
  });
}

function isHeading(line, names) {
  return exactMatch(line, names) || fuzzyMatch(line, names);
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * @param {string} text
 * @param {Array<string|{name, aliases?, required?, forbidden?, minWords?}>} sections
 * @returns {{ passed, score, missing, found, orderViolations, emptySections, forbiddenFound }}
 */
exports.check = (text, sections) => {
  if (!sections || sections.length === 0) {
    return { passed: true, score: 100, missing: [], found: [], orderViolations: [], emptySections: [], forbiddenFound: [] };
  }

  const lines = text.split('\n').map(l => l.trim());
  const allNames = sections.flatMap(getNames);

  // Find each section: position + content word count
  const foundSections = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    for (const section of sections) {
      const names = getNames(section);
      if (isHeading(lines[i], names) && !foundSections.find(f => f.displayName === getDisplayName(section))) {
        // Collect content until next heading
        let content = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j] && allNames.some(n => isHeading(lines[j], [n]))) break;
          content += ' ' + lines[j];
        }
        foundSections.push({
          section,
          displayName: getDisplayName(section),
          lineIndex: i,
          wordCount: countWords(content),
        });
        break;
      }
    }
  }

  const foundNames = foundSections.map(f => f.displayName);

  // Missing required sections
  const missing = sections
    .filter(s => isRequired(s) && !isForbidden(s) && !foundNames.includes(getDisplayName(s)))
    .map(getDisplayName);

  // Forbidden sections that were found
  const forbiddenFound = sections
    .filter(s => isForbidden(s) && foundNames.includes(getDisplayName(s)))
    .map(getDisplayName);

  // Sections with insufficient content
  const emptySections = foundSections
    .filter(f => {
      const min = getMinWords(f.section);
      return min > 0 && f.wordCount < min;
    })
    .map(f => ({ name: f.displayName, wordCount: f.wordCount, required: getMinWords(f.section) }));

  // Order violations
  const orderViolations = [];
  const foundInOrder = foundSections
    .slice().sort((a, b) => a.lineIndex - b.lineIndex)
    .map(f => f.displayName);

  const expectedOrder = sections
    .filter(s => !isForbidden(s))
    .map(getDisplayName)
    .filter(name => foundNames.includes(name));

  for (let i = 0; i < expectedOrder.length; i++) {
    if (foundInOrder[i] && foundInOrder[i] !== expectedOrder[i]) {
      orderViolations.push(`"${foundInOrder[i]}" знайдено на місці "${expectedOrder[i]}"`);
    }
  }

  // Score: percentage of checks passed
  const totalChecks = sections.length + forbiddenFound.length + emptySections.length + orderViolations.length;
  const failedChecks = missing.length + forbiddenFound.length + emptySections.length + orderViolations.length;
  const score = totalChecks === 0 ? 100 : Math.round(((totalChecks - failedChecks) / totalChecks) * 100);

  const passed = missing.length === 0 && orderViolations.length === 0
    && emptySections.length === 0 && forbiddenFound.length === 0;

  return { passed, score, missing, found: foundNames, orderViolations, emptySections, forbiddenFound };
};
