jest.mock('../pdf.service', () => ({
  extractFromLocalFile: jest.fn(),
}));

const pdfService = require('../pdf.service');
const { analyze } = require('../reference.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reference.service analyze()', () => {
  test('minTextLength = floor(totalChars * 0.8)', async () => {
    const text = 'а'.repeat(100);
    pdfService.extractFromLocalFile.mockResolvedValue(text);
    const result = await analyze('/fake/path.pdf', []);
    expect(result.totalChars).toBe(100);
    expect(result.minTextLength).toBe(Math.floor(100 * 0.8));
  });

  test('referenceText is trimmed text', async () => {
    pdfService.extractFromLocalFile.mockResolvedValue('  hello world  ');
    const result = await analyze('/fake/path.pdf', []);
    expect(result.referenceText).toBe('hello world');
  });

  test('empty sections returns updatedSections = []', async () => {
    pdfService.extractFromLocalFile.mockResolvedValue('some text');
    const result = await analyze('/fake/path.pdf', []);
    expect(result.updatedSections).toEqual([]);
  });

  test('section not found in text → returned unchanged', async () => {
    pdfService.extractFromLocalFile.mockResolvedValue('Вступ\nТекст вступу тут.');
    const section = { name: 'Висновки', required: true };
    const result = await analyze('/fake/path.pdf', [section]);
    expect(result.updatedSections[0]).toEqual(section);
  });

  test('section found → minWords set proportionally', async () => {
    const text = 'Вступ\n' + 'слово '.repeat(100).trim();
    pdfService.extractFromLocalFile.mockResolvedValue(text);
    const result = await analyze('/fake/path.pdf', [{ name: 'Вступ' }]);
    const updated = result.updatedSections[0];
    expect(updated.minWords).toBeGreaterThan(0);
    expect(updated.minWords).toBe(Math.floor(100 * 0.8));
  });

  test('totalChars matches text length', async () => {
    const text = 'Текст довжиною двадцять символів!!';
    pdfService.extractFromLocalFile.mockResolvedValue(text);
    const result = await analyze('/fake/path.pdf', []);
    expect(result.totalChars).toBe(text.trim().length);
  });

  test('string section not found → returned as-is', async () => {
    pdfService.extractFromLocalFile.mockResolvedValue('Вступ\nТекст.');
    const result = await analyze('/fake/path.pdf', ['Висновки']);
    expect(result.updatedSections[0]).toBe('Висновки');
  });
});
