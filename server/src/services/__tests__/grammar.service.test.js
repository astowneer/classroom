jest.mock('axios');
const axios = require('axios');
const { check } = require('../grammar.service');

function makeMatch(overrides = {}) {
  return {
    message: 'Test error',
    context: { text: 'some context' },
    offset: 0,
    length: 5,
    replacements: [{ value: 'fix1' }, { value: 'fix2' }, { value: 'fix3' }, { value: 'fix4' }],
    rule: { id: 'RULE_ID' },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('grammar.service check()', () => {
  test('returns errorCount and errors for successful response', async () => {
    axios.post.mockResolvedValue({ data: { matches: [makeMatch()] } });
    const result = await check('Тестовий текст для перевірки.');
    expect(result.errorCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      message: 'Test error',
      context: 'some context',
      offset: 0,
      length: 5,
      ruleId: 'RULE_ID',
    });
  });

  test('returns errorCount:0 and empty errors for empty matches', async () => {
    axios.post.mockResolvedValue({ data: { matches: [] } });
    const result = await check('Текст без помилок.');
    expect(result.errorCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  test('replacements are truncated to 3', async () => {
    axios.post.mockResolvedValue({ data: { matches: [makeMatch()] } });
    const result = await check('Текст.');
    expect(result.errors[0].replacements).toHaveLength(3);
  });

  test('propagates axios error', async () => {
    axios.post.mockRejectedValue(new Error('Network error'));
    await expect(check('Текст.')).rejects.toThrow('Network error');
  });

  test('text > 15000 chars is split into chunks and offsets are adjusted', async () => {
    // First chunk returns error at offset 10, second chunk returns error at offset 5
    axios.post
      .mockResolvedValueOnce({ data: { matches: [makeMatch({ offset: 10 })] } })
      .mockResolvedValueOnce({ data: { matches: [makeMatch({ offset: 5 })] } });

    const longText = 'а'.repeat(16000);
    const result = await check(longText);

    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(result.errorCount).toBe(2);
    // Second chunk offset should be adjusted by first chunk length (15000)
    expect(result.errors[1].offset).toBe(15000 + 5);
  });
});
