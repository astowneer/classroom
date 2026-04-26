const { calculate } = require('../grading.service');

describe('grading.service calculate()', () => {
  test('returns null when gradingConfig is null', () => {
    expect(calculate(null, {})).toBeNull();
  });

  describe('plagiarism only', () => {
    const cfg = {
      plagiarism: {
        max: 4,
        thresholds: [
          { limit: 0.1, score: 4 },
          { limit: 0.3, score: 2 },
          { limit: 1.0, score: 0 },
        ],
      },
    };

    test('low plagiarism (0.05) → max score', () => {
      const r = calculate(cfg, { plagiarismScore: 0.05 });
      expect(r.breakdown.plagiarism.score).toBe(4);
    });

    test('mid plagiarism (0.2) → mid score', () => {
      const r = calculate(cfg, { plagiarismScore: 0.2 });
      expect(r.breakdown.plagiarism.score).toBe(2);
    });

    test('high plagiarism (0.9) → 0 score', () => {
      const r = calculate(cfg, { plagiarismScore: 0.9 });
      expect(r.breakdown.plagiarism.score).toBe(0);
    });
  });

  describe('structure only', () => {
    const cfg = { structure: { max: 3 } };

    test('score = max * (structureResult.score / 100)', () => {
      const r = calculate(cfg, { structureResult: { score: 80 } });
      expect(r.breakdown.structure.score).toBeCloseTo(2.4);
    });

    test('structureResult absent → not in breakdown', () => {
      const r = calculate(cfg, {});
      expect(r.breakdown.structure).toBeUndefined();
    });
  });

  describe('completeness only', () => {
    const cfg = { completeness: { max: 2 } };

    test('score = max * completenessResult.score', () => {
      const r = calculate(cfg, { completenessResult: { score: 0.75 } });
      expect(r.breakdown.completeness.score).toBeCloseTo(1.5);
    });
  });

  describe('grammar only', () => {
    const cfg = {
      grammar: {
        max: 1,
        thresholds: [
          { limit: 5,   score: 1 },
          { limit: 20,  score: 0.5 },
          { limit: 999, score: 0 },
        ],
      },
    };

    test('few errors (3) → max score', () => {
      const r = calculate(cfg, { grammarResult: { errorCount: 3 } });
      expect(r.breakdown.grammar.score).toBe(1);
    });

    test('moderate errors (10) → mid score', () => {
      const r = calculate(cfg, { grammarResult: { errorCount: 10 } });
      expect(r.breakdown.grammar.score).toBe(0.5);
    });

    test('many errors (50) → 0 score', () => {
      const r = calculate(cfg, { grammarResult: { errorCount: 50 } });
      expect(r.breakdown.grammar.score).toBe(0);
    });
  });

  test('all four components → total equals sum', () => {
    const cfg = {
      plagiarism:   { max: 4, thresholds: [{ limit: 0.1, score: 4 }, { limit: 1, score: 0 }] },
      structure:    { max: 3 },
      completeness: { max: 2 },
      grammar:      { max: 1, thresholds: [{ limit: 5, score: 1 }, { limit: 999, score: 0 }] },
    };
    const r = calculate(cfg, {
      plagiarismScore: 0.05,
      structureResult: { score: 100 },
      completenessResult: { score: 1 },
      grammarResult: { errorCount: 0 },
    });
    expect(r.total).toBeCloseTo(r.breakdown.plagiarism.score + r.breakdown.structure.score + r.breakdown.completeness.score + r.breakdown.grammar.score);
    expect(r.maxTotal).toBe(10);
  });

  test('round() produces at most 2 decimal places', () => {
    const cfg = { structure: { max: 3 } };
    const r = calculate(cfg, { structureResult: { score: 33 } });
    const str = r.breakdown.structure.score.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});
