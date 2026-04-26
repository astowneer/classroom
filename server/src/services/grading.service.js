/**
 * Calculate grade based on check results and grading config.
 *
 * gradingConfig example:
 * {
 *   plagiarism:   { max: 4, thresholds: [{limit: 0.1, score: 4}, {limit: 0.3, score: 2}, {limit: 1, score: 0}] },
 *   structure:    { max: 3 },
 *   completeness: { max: 2 },
 *   grammar:      { max: 1, thresholds: [{limit: 5, score: 1}, {limit: 20, score: 0.5}, {limit: 999, score: 0}] },
 * }
 *
 * For plagiarism/grammar: thresholds define score brackets by value.
 * For structure/completeness: score = max * percentage.
 */
exports.calculate = (gradingConfig, { plagiarismScore, structureResult, completenessResult, grammarResult }) => {
  if (!gradingConfig) return null;

  const breakdown = {};
  let total = 0;
  let maxTotal = 0;

  // ── Plagiarism ────────────────────────────────────────────────────────────
  if (gradingConfig.plagiarism) {
    const cfg = gradingConfig.plagiarism;
    maxTotal += cfg.max;
    const score = scoreByThresholds(
      plagiarismScore ?? 0,
      cfg.thresholds ?? [
        { limit: 0.1, score: cfg.max },
        { limit: 0.3, score: cfg.max * 0.5 },
        { limit: 1.0, score: 0 },
      ],
      cfg.max
    );
    breakdown.plagiarism = { score: round(score), max: cfg.max };
    total += score;
  }

  // ── Structure ─────────────────────────────────────────────────────────────
  if (gradingConfig.structure && structureResult) {
    const cfg = gradingConfig.structure;
    maxTotal += cfg.max;
    const pct = (structureResult.score ?? (structureResult.passed ? 100 : 0)) / 100;
    const score = cfg.max * pct;
    breakdown.structure = { score: round(score), max: cfg.max };
    total += score;
  }

  // ── Completeness ──────────────────────────────────────────────────────────
  if (gradingConfig.completeness && completenessResult?.score != null) {
    const cfg = gradingConfig.completeness;
    maxTotal += cfg.max;
    const score = cfg.max * completenessResult.score;
    breakdown.completeness = { score: round(score), max: cfg.max };
    total += score;
  }

  // ── Grammar ───────────────────────────────────────────────────────────────
  if (gradingConfig.grammar && grammarResult) {
    const cfg = gradingConfig.grammar;
    maxTotal += cfg.max;
    const errorCount = grammarResult.errorCount ?? 0;
    const score = scoreByThresholds(
      errorCount,
      cfg.thresholds ?? [
        { limit: 5,   score: cfg.max },
        { limit: 20,  score: cfg.max * 0.5 },
        { limit: 999, score: 0 },
      ],
      cfg.max
    );
    breakdown.grammar = { score: round(score), max: cfg.max, errorCount };
    total += score;
  }

  return { total: round(total), maxTotal, breakdown };
};

// Returns score for the first threshold where value <= limit
function scoreByThresholds(value, thresholds, maxScore) {
  for (const t of thresholds) {
    if (value <= t.limit) return Math.min(t.score, maxScore);
  }
  return 0;
}

function round(n) { return Math.round(n * 100) / 100; }
