const { check } = require('../structure.service');

describe('structure.service check()', () => {
  test('empty sections array returns passed:true score:100', () => {
    const result = check('some text', []);
    expect(result).toEqual({
      passed: true,
      score: 100,
      missing: [],
      found: [],
      orderViolations: [],
      emptySections: [],
      forbiddenFound: [],
    });
  });

  test('null sections returns passed:true score:100', () => {
    const result = check('some text', null);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  test('all required sections found → passed:true', () => {
    const text = 'Вступ\nТекст вступу тут.\nВисновки\nТекст висновків тут.';
    const result = check(text, ['Вступ', 'Висновки']);
    expect(result.passed).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  test('missing required section appears in missing[]', () => {
    const text = 'Вступ\nТекст вступу тут.';
    const result = check(text, ['Вступ', 'Висновки']);
    expect(result.missing).toContain('Висновки');
    expect(result.passed).toBe(false);
  });

  test('forbidden section found → in forbiddenFound[]', () => {
    const text = 'Вступ\nТекст.\nЗабороненийРозділ\nТекст.';
    const sections = [
      'Вступ',
      { name: 'ЗабороненийРозділ', forbidden: true },
    ];
    const result = check(text, sections);
    expect(result.forbiddenFound).toContain('ЗабороненийРозділ');
    expect(result.passed).toBe(false);
  });

  test('order violation detected', () => {
    // Expected: Вступ then Висновки, but text has them reversed
    const text = 'Висновки\nТекст висновків.\nВступ\nТекст вступу.';
    const result = check(text, ['Вступ', 'Висновки']);
    expect(result.orderViolations.length).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
  });

  test('section with insufficient minWords → in emptySections[]', () => {
    const text = 'Вступ\nМало слів.\nВисновки\nДостатньо слів у висновках для проходження перевірки мінімуму.';
    const sections = [
      { name: 'Вступ', minWords: 50 },
      'Висновки',
    ];
    const result = check(text, sections);
    expect(result.emptySections.some(e => e.name === 'Вступ')).toBe(true);
    expect(result.passed).toBe(false);
  });

  test('duplicate heading → in duplicates[]', () => {
    const text = 'Вступ\nПерший вступ.\nВступ\nДругий вступ.';
    const result = check(text, ['Вступ']);
    expect(result.duplicates).toContain('Вступ');
    expect(result.passed).toBe(false);
  });

  test('fuzzy match with typo in heading', () => {
    // "Вступп" is close to "Вступ"
    const text = 'Вступп\nТекст вступу тут.';
    const result = check(text, ['Вступ']);
    expect(result.found).toContain('Вступ');
  });

  test('exact match with numeric prefix', () => {
    const text = '1. Вступ\nТекст вступу тут.';
    const result = check(text, ['Вступ']);
    expect(result.found).toContain('Вступ');
  });

  test('alias match finds section', () => {
    const text = 'Введення\nТекст введення тут.';
    const sections = [{ name: 'Вступ', aliases: ['Введення'] }];
    const result = check(text, sections);
    expect(result.found).toContain('Вступ');
    expect(result.missing).not.toContain('Вступ');
  });
});
