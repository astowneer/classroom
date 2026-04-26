const {
  normalize,
  tokenizeWords,
  buildShingles,
  jaccard,
  removeBoilerplate,
  removeStopPhrases,
  splitSentences,
  MIN_WORDS,
  MIN_CHARS,
} = require('../text.utils');

describe('normalize', () => {
  test('removes soft hyphens', () => {
    expect(normalize('сло\u00ADво')).toBe('слово');
  });

  test('removes hyphen before line break', () => {
    expect(normalize('сло-\n  во')).toBe('слово');
  });

  test('collapses multiple spaces and tabs', () => {
    expect(normalize('a  \t  b')).toBe('a b');
  });

  test('collapses 3+ newlines to 2', () => {
    expect(normalize('a\n\n\n\nb')).toBe('a\n\nb');
  });

  test('returns empty string for falsy input', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });

  test('trims leading/trailing whitespace', () => {
    expect(normalize('  hello  ')).toBe('hello');
  });
});

describe('tokenizeWords', () => {
  test('splits on whitespace', () => {
    expect(tokenizeWords('hello world')).toEqual(['hello', 'world']);
  });

  test('lowercases all words', () => {
    expect(tokenizeWords('Hello World')).toEqual(['hello', 'world']);
  });

  test('handles Cyrillic', () => {
    expect(tokenizeWords('Привіт Світ')).toEqual(['привіт', 'світ']);
  });

  test('strips punctuation', () => {
    expect(tokenizeWords('hello, world!')).toEqual(['hello', 'world']);
  });

  test('filters empty tokens', () => {
    expect(tokenizeWords('  a  b  ')).toEqual(['a', 'b']);
  });
});

describe('buildShingles', () => {
  test('returns empty Set for fewer than 6 words', () => {
    expect(buildShingles(['a', 'b', 'c', 'd', 'e'])).toEqual(new Set());
  });

  test('returns one shingle for exactly 6 words', () => {
    const s = buildShingles(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(s.size).toBe(1);
    expect(s.has('a b c d e f')).toBe(true);
  });

  test('returns N-5 shingles for N words', () => {
    const words = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(buildShingles(words).size).toBe(2);
  });
});

describe('jaccard', () => {
  test('returns 0 when both sets are empty', () => {
    expect(jaccard(new Set(), new Set())).toBe(0);
  });

  test('returns 0 when one set is empty', () => {
    expect(jaccard(new Set(['a']), new Set())).toBe(0);
  });

  test('returns 1 for identical sets', () => {
    const s = new Set(['a', 'b', 'c']);
    expect(jaccard(s, s)).toBe(1);
  });

  test('returns correct partial similarity', () => {
    const a = new Set(['a', 'b', 'c']);
    const b = new Set(['b', 'c', 'd']);
    // intersection=2, union=4 → 0.5
    expect(jaccard(a, b)).toBeCloseTo(0.5);
  });

  test('returns 0 for disjoint sets', () => {
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0);
  });
});

describe('removeBoilerplate', () => {
  test('removes lines matching boilerplate pattern (Варіант №N)', () => {
    const text = 'Нормальний текст тут є\nВаріант №3\nЩе текст тут є';
    const result = removeBoilerplate(text);
    expect(result).not.toContain('Варіант №3');
    expect(result).toContain('Нормальний текст тут є');
  });

  test('removes lines with 2 or fewer words', () => {
    const text = 'Нормальний рядок тексту\nКороткий\nЩе один нормальний рядок';
    const result = removeBoilerplate(text);
    expect(result).not.toContain('Короткий');
  });

  test('filters empty lines — result has no empty-only lines', () => {
    const text = 'Рядок один два три\n\nРядок два три чотири';
    const result = removeBoilerplate(text);
    result.split('\n').forEach(l => expect(l.trim()).not.toBe(''));
  });

  test('keeps normal lines', () => {
    const text = 'Це нормальний рядок тексту без шаблонів';
    expect(removeBoilerplate(text)).toContain('Це нормальний рядок тексту без шаблонів');
  });
});

describe('removeStopPhrases', () => {
  test('removes stop phrase case-insensitively', () => {
    const result = removeStopPhrases('Hello World foo', ['world']);
    expect(result).not.toContain('World');
  });

  test('returns original text when stopPhrases is null', () => {
    expect(removeStopPhrases('hello', null)).toBe('hello');
  });

  test('returns original text when stopPhrases is empty array', () => {
    expect(removeStopPhrases('hello', [])).toBe('hello');
  });

  test('escapes regex special characters in phrase', () => {
    const result = removeStopPhrases('price is $100.00 today', ['$100.00']);
    expect(result).not.toContain('$100.00');
  });

  test('skips empty/whitespace-only phrases', () => {
    expect(removeStopPhrases('hello world', ['', '  '])).toBe('hello world');
  });

  test('removes multiple phrases', () => {
    const result = removeStopPhrases('foo bar baz', ['foo', 'baz']);
    expect(result).not.toContain('foo');
    expect(result).not.toContain('baz');
    expect(result).toContain('bar');
  });
});

describe('splitSentences', () => {
  test('splits on sentence-ending punctuation followed by capital letter', () => {
    const text = 'Перше речення. Друге речення тут є.';
    const sentences = splitSentences(text);
    expect(sentences.length).toBeGreaterThanOrEqual(1);
  });

  test('filters out sentences shorter than MIN_CHARS', () => {
    const short = 'Ok.';
    const long = 'Це достатньо довге речення для тесту. Ще одне речення тут.';
    const sentences = splitSentences(short + ' ' + long);
    sentences.forEach(s => {
      expect(s.length).toBeGreaterThanOrEqual(MIN_CHARS);
    });
  });

  test('filters out sentences with fewer than MIN_WORDS words', () => {
    const sentences = splitSentences('Це довге речення яке має достатньо слів для проходження фільтру.');
    sentences.forEach(s => {
      expect(tokenizeWords(s).length).toBeGreaterThanOrEqual(MIN_WORDS);
    });
  });

  test('returns empty array for empty string', () => {
    expect(splitSentences('')).toEqual([]);
  });
});
