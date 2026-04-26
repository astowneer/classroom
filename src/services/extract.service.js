/**
 * Extract metadata fields from submission text using regex patterns.
 * @param {string} text
 * @param {Array<{label: string, pattern: string}>} fields
 * @returns {Object} e.g. { "Варіант": "7", "Виконав": "Іваненко І.І." }
 */
exports.extract = (text, fields) => {
  if (!fields?.length || !text) return {};
  const result = {};
  for (const { label, pattern, maxLength } of fields) {
    if (!label || !pattern) continue;
    try {
      const regex = new RegExp(pattern, 'i');
      const match = regex.exec(text);
      let value = match ? (match[1] ?? match[0]).trim() : null;
      if (value && maxLength) value = value.slice(0, maxLength).trim();
      result[label] = value;
    } catch {
      result[label] = null; // invalid regex
    }
  }
  return result;
};
