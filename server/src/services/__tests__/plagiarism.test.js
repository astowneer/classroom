// Mock DB models — compareTexts doesn't use them but the module requires them
jest.mock('../../models', () => ({
  PlagiarismResult: { upsert: jest.fn() },
}));

const { compareTexts } = require('../plagiarism.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const SENT = 'The quick brown fox jumps over the lazy dog near the river bank.';
const SENT_UA = 'Швидка руда лисиця стрибає через ледачого пса біля берега річки.';

function matchCount(result) { return result.matchCount; }
function similarity(result) { return result.similarity; }
function hasHighlight(result, side) {
  return result.matches.some(m => {
    const r = side === 'A' ? m.inA : m.inB;
    return r && r.start >= 0 && r.end > r.start;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('compareTexts', () => {

  // 1. Identical texts
  test('identical texts → high similarity', () => {
    const text = `${SENT} ${SENT_UA} It was popularised in the 1960s with the release of Letraset sheets.`;
    const r = compareTexts(text, text);
    expect(r.similarity).toBeGreaterThan(0.8);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 2. Completely different texts
  test('completely different texts → zero matches', () => {
    const r = compareTexts(
      'Apple banana cherry grape lemon orange peach plum strawberry watermelon.',
      'Комп\'ютер монітор клавіатура мишка принтер сканер модем роутер кабель диск.'
    );
    expect(r.matchCount).toBe(0);
    expect(r.similarity).toBe(0);
  });

  // 3. One sentence copied verbatim
  test('one sentence copied verbatim → found', () => {
    const copied = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textA = `Some intro text here. ${copied} More content follows after this point.`;
    const textB = `Different beginning here. ${copied} And different ending too.`;
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
    expect(hasHighlight(r, 'A')).toBe(true);
    expect(hasHighlight(r, 'B')).toBe(true);
  });

  // 4. Copied text in different position (beginning vs end)
  test('same sentence at different positions → still found', () => {
    const copied = 'It has survived not only five centuries but also the leap into electronic typesetting.';
    const textA = `${copied} Some other content here that is unique to text A only.`;
    const textB = `Unique content for text B that does not appear elsewhere. ${copied}`;
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 5. Minor punctuation differences
  test('same text with different punctuation → found', () => {
    const textA = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textB = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry!';
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 6. Extra spaces and line breaks
  test('same text with extra whitespace → found', () => {
    const textA = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textB = 'Lorem  Ipsum  is  simply  dummy  text  of  the  printing  and  typesetting  industry.';
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 7. Case differences
  test('same text different case → found', () => {
    const textA = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textB = 'LOREM IPSUM IS SIMPLY DUMMY TEXT OF THE PRINTING AND TYPESETTING INDUSTRY.';
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 8. Partial overlap — only part of text copied
  test('partial copy → partial similarity', () => {
    const shared = 'when an unknown printer took a galley of type and scrambled it to make a type specimen book';
    const textA = `Some unique intro. ${shared}. More unique content here only in A.`;
    const textB = `Completely different start. ${shared}. And different ending only in B.`;
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
    expect(r.similarity).toBeLessThan(1);
  });

  // 9. Duplicate sentence in text B — should count only once
  test('sentence duplicated in B → counted once', () => {
    const copied = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textA = `${copied} Some other unique content here.`;
    const textB = `${copied} Some filler text in between here. ${copied}`;
    const r = compareTexts(textA, textB);
    // Should find the match but not double-count the same A sentence
    const aTexts = r.matches.map(m => m.textA);
    const uniqueATexts = new Set(aTexts);
    expect(uniqueATexts.size).toBe(aTexts.length); // no duplicate A matches
  });

  // 10. Short texts below minimum sequence length → no match
  test('texts shorter than min sequence → no match', () => {
    const r = compareTexts('hello world test', 'hello world test');
    expect(r.matchCount).toBe(0);
  });

  // 11. Ukrainian text copied
  test('ukrainian copied sentence → found', () => {
    const copied = SENT_UA + ' Це речення є спільним для обох текстів і має бути знайдено.';
    const textA = `Унікальний вступ першого тексту. ${copied}`;
    const textB = `Інший початок другого тексту. ${copied}`;
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 12. Mixed language text
  test('mixed language text → finds matches in correct language', () => {
    const copied = 'Lorem Ipsum is simply dummy text of the printing industry.';
    const textA = `Вступ українською мовою. ${copied} Висновок українською.`;
    const textB = `Інший вступ. ${copied} Інший висновок.`;
    const r = compareTexts(textA, textB);
    expect(r.matchCount).toBeGreaterThan(0);
  });

  // 13. Inserted words in the middle (paraphrasing)
  test('inserted words break sequence below min length → reduced matches', () => {
    const textA = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry standard.';
    // Every 3 words an extra word inserted — breaks 6-word sequences
    const textB = 'Lorem Ipsum EXTRA is simply EXTRA dummy text EXTRA of the EXTRA printing and EXTRA typesetting industry EXTRA standard.';
    const r1 = compareTexts(textA, textA); // baseline
    const r2 = compareTexts(textA, textB); // with insertions
    expect(r2.similarity).toBeLessThan(r1.similarity);
  });

  // 14. Highlight positions are valid
  test('match positions are within text bounds', () => {
    const copied = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.';
    const textA = `Intro. ${copied} Outro.`;
    const textB = `Start. ${copied} End.`;
    const r = compareTexts(textA, textB);
    for (const m of r.matches) {
      expect(m.inA.start).toBeGreaterThanOrEqual(0);
      expect(m.inA.end).toBeLessThanOrEqual(textA.length);
      expect(m.inB.start).toBeGreaterThanOrEqual(0);
      expect(m.inB.end).toBeLessThanOrEqual(textB.length);
      expect(m.inA.end).toBeGreaterThan(m.inA.start);
      expect(m.inB.end).toBeGreaterThan(m.inB.start);
    }
  });

  // 15. Empty inputs
  test('empty textA → no matches', () => {
    const r = compareTexts('', 'Some text here that should not match anything.');
    expect(r.matchCount).toBe(0);
    expect(r.similarity).toBe(0);
  });

  // 16. Large combined text — multiple fragments mixed together
  test('large combined text with many fragments → finds all shared parts', () => {
    const textA = [
      'Вступ українською мовою. Lorem Ipsum is simply dummy text of the printing industry. Висновок українською.',
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry standard.',
      'The quick brown fox jumps over the lazy dog near the river bank. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Швидка руда лисиця стрибає через ледачого пса біля берега річки.',
      'It was popularised in the 1960s with the release of Letraset sheets.',
      'Apple banana cherry grape lemon orange peach plum strawberry watermelon.',
      'Some intro text here. Lorem Ipsum is simply dummy text of the printing and typesetting industry. More content follows.',
      'It has survived not only five centuries but also the leap into electronic typesetting. Some other unique content here.',
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      'Some unique intro. when an unknown printer took a galley of type and scrambled it to make a type specimen book. More unique content.',
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Some other unique content here.',
      'Унікальний вступ першого тексту. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Це речення є спільним для обох текстів і має бути знайдено.',
    ].join('\n\n');

    const textB = [
      'Комп\'ютер монітор клавіатура мишка принтер сканер модем роутер кабель диск.',
      'The quick brown fox jumps over the lazy dog near the river bank. Швидка руда лисиця стрибає через ледачого пса біля берега річки. It was popularised in the 1960s with the release of Letraset sheets.',
      'Different beginning here. Lorem Ipsum is simply dummy text of the printing and typesetting industry. And different ending.',
      'Unique content for text B that does not appear elsewhere. It has survived not only five centuries but also the leap into electronic typesetting.',
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry!',
      'LOREM IPSUM IS SIMPLY DUMMY TEXT OF THE PRINTING AND TYPESETTING INDUSTRY.',
      'Completely different start. when an unknown printer took a galley of type and scrambled it to make a type specimen book. Different ending.',
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Some filler text. Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      'Інший початок другого тексту. Швидка руда лисиця стрибає через ледачого пса біля берега річки. Це речення є спільним для обох текстів і має бути знайдено.',
      'Інший вступ. Lorem Ipsum is simply dummy text of the printing industry. Інший висновок.',
      'Lorem Ipsum EXTRA is simply EXTRA dummy text EXTRA of the EXTRA printing and EXTRA typesetting industry EXTRA standard.',
    ].join('\n\n');

    const r = compareTexts(textA, textB);

    // Should find multiple matches
    expect(r.matchCount).toBeGreaterThan(3);
    expect(r.similarity).toBeGreaterThan(0.2);

    console.log(`  → знайдено ${r.matchCount} збігів, similarity: ${r.similarity}`);
    r.matches.forEach((m, i) => console.log(`    [${i+1}] "${m.textA.slice(0, 60)}..."`));
  });
});
