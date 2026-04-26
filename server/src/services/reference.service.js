const pdfService = require('./pdf.service');
const structureService = require('./structure.service');

const MARGIN = 0.8; // 80% of reference = minimum required (20% запас)

/**
 * Analyze reference PDF and extract settings for the assignment.
 * @param {string} filePath - local path to uploaded reference PDF
 * @param {Array} sections - current structureRequirements
 * @returns {{ minTextLength, updatedSections, description }}
 */
exports.analyze = async (filePath, sections = []) => {
  const text = await pdfService.extractFromLocalFile(filePath);
  const totalChars = text.trim().length;
  const minTextLength = Math.floor(totalChars * MARGIN);

  // Calculate minWords per section
  const lines = text.split('\n').map(l => l.trim());
  const updatedSections = sections.map(section => {
    const names = typeof section === 'object'
      ? [section.name, ...(section.aliases || [])]
      : [section];

    // Find section start line
    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (names.some(name => new RegExp(`^(\\d+[.)\\s]+)?${escapeRegex(name)}\\s*$`, 'i').test(lines[i]))) {
        startIdx = i;
        break;
      }
    }
    if (startIdx === -1) return section;

    // Collect content until next known section heading
    const allNames = sections.flatMap(s => typeof s === 'object' ? [s.name, ...(s.aliases || [])] : [s]);
    let content = '';
    for (let j = startIdx + 1; j < lines.length; j++) {
      if (allNames.some(n => new RegExp(`^(\\d+[.)\\s]+)?${escapeRegex(n)}\\s*$`, 'i').test(lines[j]))) break;
      content += ' ' + lines[j];
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const minWords = Math.floor(wordCount * MARGIN);

    return typeof section === 'object'
      ? { ...section, minWords: minWords || section.minWords }
      : { name: section, minWords };
  });

  // Full text stored separately as referenceText for AI — description stays human-readable
  const referenceText = text.trim();

  return { minTextLength, updatedSections, referenceText, totalChars };
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
