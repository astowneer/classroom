const axios = require('axios');

const LT_URL = process.env.LANGUAGETOOL_URL || 'http://localhost:8081/v2/check';

/**
 * Check grammar of text using local LanguageTool server.
 * @param {string} text
 * @returns {{ errorCount: number, errors: Array<{message, context, offset, length, replacements}> }}
 */
exports.check = async (text) => {
  // LanguageTool has a 20k char limit per request — split if needed
  const chunks = splitIntoChunks(text, 15000);
  const allErrors = [];
  let offset = 0;

  for (const chunk of chunks) {
    const response = await axios.post(LT_URL, new URLSearchParams({
      text: chunk,
      language: 'uk',
      disabledRules: 'WHITESPACE_RULE,UNPAIRED_BRACKETS',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    for (const match of response.data.matches) {
      allErrors.push({
        message: match.message,
        context: match.context.text,
        offset: match.offset + offset,
        length: match.length,
        replacements: match.replacements.slice(0, 3).map(r => r.value),
        ruleId: match.rule.id,
      });
    }
    offset += chunk.length;
  }

  return { errorCount: allErrors.length, errors: allErrors };
};

function splitIntoChunks(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
