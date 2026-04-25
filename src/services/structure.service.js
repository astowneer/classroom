/**
 * Checks whether required sections are present as headings in extracted text.
 * Matches lines that contain the section name (case-insensitive),
 * optionally preceded by a number (e.g. "1. Вступ", "ВСТУП", "Вступ").
 *
 * @param {string} text
 * @param {string[]} requiredSections - e.g. ["Вступ", "Висновок"]
 * @returns {{ passed: boolean, missing: string[], found: string[] }}
 */
exports.check = (text, requiredSections) => {
  if (!requiredSections || requiredSections.length === 0) {
    return { passed: true, missing: [], found: [] };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const missing = [];
  const found = [];

  for (const section of requiredSections) {
    const pattern = new RegExp(`^(\\d+[.)\\s]+)?${escapeRegex(section)}\\s*$`, 'i');
    const isFound = lines.some(line => pattern.test(line));
    if (isFound) found.push(section);
    else missing.push(section);
  }

  return { passed: missing.length === 0, missing, found };
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
