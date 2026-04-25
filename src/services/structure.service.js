/**
 * Checks whether required sections are present in extracted text.
 * @param {string} text
 * @param {string[]} requiredSections - e.g. ["Вступ", "Висновок"]
 * @returns {{ passed: boolean, missing: string[] }}
 */
exports.check = (text, requiredSections) => {
  const missing = requiredSections.filter(
    section => !text.toLowerCase().includes(section.toLowerCase())
  );
  return { passed: missing.length === 0, missing };
};
