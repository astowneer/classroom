const { extract } = require('../extract.service');

describe('extract.service extract()', () => {
  test('returns {} for empty text', () => {
    expect(extract('', [{ label: 'Варіант', pattern: 'Варіант:\\s*(\\d+)' }])).toEqual({});
  });

  test('returns {} for empty fields array', () => {
    expect(extract('some text', [])).toEqual({});
  });

  test('returns {} for null fields', () => {
    expect(extract('some text', null)).toEqual({});
  });

  test('extracts capture group 1 when pattern matches', () => {
    const result = extract('Варіант: 7', [{ label: 'Варіант', pattern: 'Варіант:\\s*(\\d+)' }]);
    expect(result.Варіант).toBe('7');
  });

  test('returns null when pattern does not match', () => {
    const result = extract('Немає нічого', [{ label: 'Варіант', pattern: 'Варіант:\\s*(\\d+)' }]);
    expect(result.Варіант).toBeNull();
  });

  test('truncates value to maxLength', () => {
    const result = extract('Name: Іваненко Іван Іванович', [
      { label: 'Name', pattern: 'Name:\\s*(.+)', maxLength: 5 },
    ]);
    expect(result.Name).toHaveLength(5);
  });

  test('returns null for invalid regex without throwing', () => {
    const result = extract('some text', [{ label: 'Bad', pattern: '[invalid' }]);
    expect(result.Bad).toBeNull();
  });

  test('skips field without label', () => {
    const result = extract('text', [{ pattern: '\\d+' }]);
    expect(result).toEqual({});
  });

  test('skips field without pattern', () => {
    const result = extract('text', [{ label: 'X' }]);
    expect(result).toEqual({});
  });

  test('extracts multiple fields simultaneously', () => {
    const text = 'Варіант: 3\nВиконав: Петренко П.П.';
    const result = extract(text, [
      { label: 'Варіант', pattern: 'Варіант:\\s*(\\d+)' },
      { label: 'Виконав', pattern: 'Виконав:\\s*(.+)' },
    ]);
    expect(result.Варіант).toBe('3');
    expect(result.Виконав).toBe('Петренко П.П.');
  });
});
