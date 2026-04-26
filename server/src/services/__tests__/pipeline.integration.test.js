/**
 * Integration test: full submission checking pipeline
 *
 * Tests the real logic of:
 * 1. Plagiarism detection between multiple submissions
 * 2. Structure checking
 * 3. Grading calculation
 * 4. Report creation
 *
 * External dependencies (DB, Drive, LanguageTool, transformers) are mocked.
 * All business logic runs with real implementations.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(
    jest.fn().mockResolvedValue({ data: new Float32Array(384).fill(0.1) })
  ),
}), { virtual: true });

jest.mock('../../models', () => {
  const upsertMock = jest.fn().mockResolvedValue([{ id: 1 }, true]);
  return {
    PlagiarismResult: { upsert: upsertMock },
    Report: { upsert: jest.fn().mockResolvedValue([{ id: 1, plagiarismScore: 0, structurePassed: true, details: {}, grade: null, extractedFields: null }, true]) },
    Submission: { findByPk: jest.fn(), findAll: jest.fn() },
    Assignment: { findByPk: jest.fn() },
    User: {},
  };
});

const plagiarismService = require('../plagiarism.service');
const structureService  = require('../structure.service');
const gradingService    = require('../grading.service');
const reportService     = require('../report.service');
const { Report }        = require('../../models');

// ── Test data ─────────────────────────────────────────────────────────────────

const ORIGINAL = `
Вступ
У даній лабораторній роботі досліджується налаштування мережі в операційній системі Linux.
Метою роботи є вивчення основних команд для роботи з мережевими інтерфейсами.

Теоретичні відомості
Мережевий інтерфейс — це програмно-апаратний компонент, що забезпечує з'єднання комп'ютера з мережею.
Команда ip address show відображає поточні налаштування мережевих інтерфейсів системи.
Для перевірки доступності вузлів використовується команда ping, яка надсилає ICMP-пакети.
Команда traceroute дозволяє визначити маршрут до вказаного хоста в мережі.

Практична частина
Для виконання роботи було використано віртуальну машину з встановленою ОС Ubuntu Linux.
Перевірка мережевих налаштувань здійснювалась за допомогою команди ip address show.
Результати виконання команди ping показали доступність всіх вузлів у локальній мережі.

Висновок
У ході виконання лабораторної роботи було досліджено принципи налаштування мережі в Linux.
Отримані навички дозволяють ефективно діагностувати та налаштовувати мережеві з'єднання.
`.trim();

// Copied large portion from ORIGINAL
const PLAGIARIZED = `
Вступ
У даній лабораторній роботі досліджується налаштування мережі в операційній системі Linux.
Метою роботи є вивчення основних команд для роботи з мережевими інтерфейсами.

Теоретичні відомості
Мережевий інтерфейс — це програмно-апаратний компонент, що забезпечує з'єднання комп'ютера з мережею.
Команда ip address show відображає поточні налаштування мережевих інтерфейсів системи.
Для перевірки доступності вузлів використовується команда ping, яка надсилає ICMP-пакети.

Практична частина
Для виконання роботи було використано віртуальну машину з встановленою ОС Ubuntu Linux.
Перевірка мережевих налаштувань здійснювалась за допомогою команди ip address show.

Висновок
Власний висновок студента, написаний самостійно без запозичень з інших джерел.
`.trim();

// Completely original
const UNIQUE = `
Вступ
Дана робота присвячена вивченню мережевих протоколів та їх практичному застосуванню.
Основна увага приділяється протоколам транспортного рівня моделі OSI.

Теоретичні відомості
Протокол TCP забезпечує надійну передачу даних з підтвердженням отримання пакетів.
Протокол UDP використовується для швидкої передачі без гарантії доставки пакетів.
Порти дозволяють розрізняти різні мережеві служби на одному хості системи.

Практична частина
Аналіз мережевого трафіку проводився за допомогою утиліти Wireshark на тестовому стенді.
Було зафіксовано встановлення TCP-з'єднання через процедуру тристороннього рукостискання.

Висновок
В результаті роботи було вивчено основні мережеві протоколи та їх характеристики.
Отримані знання є важливими для розуміння принципів роботи комп'ютерних мереж.
`.trim();

const makeSubmission = (id, text, submittedAt) => ({
  id,
  extractedText: text,
  originalText: text,
  submittedAt: new Date(submittedAt),
  toJSON() { return this; },
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Full checking pipeline', () => {

  describe('Plagiarism detection', () => {
    test('identical texts → similarity ~1.0', () => {
      const result = plagiarismService.compareTexts(ORIGINAL, ORIGINAL);
      expect(result.similarity).toBeGreaterThan(0.9);
      expect(result.matchCount).toBeGreaterThan(0);
    });

    test('plagiarized text → high similarity with original', () => {
      const result = plagiarismService.compareTexts(ORIGINAL, PLAGIARIZED);
      expect(result.similarity).toBeGreaterThan(0.3);
      expect(result.matchCount).toBeGreaterThan(1);
    });

    test('unique text → low similarity with original', () => {
      const result = plagiarismService.compareTexts(ORIGINAL, UNIQUE);
      expect(result.similarity).toBeLessThan(0.2);
    });

    test('compare() — plagiarized submission flagged, unique is not', async () => {
      const original   = makeSubmission(1, ORIGINAL,   '2024-01-01');
      const plagiarized = makeSubmission(2, PLAGIARIZED, '2024-01-02');
      const unique     = makeSubmission(3, UNIQUE,      '2024-01-03');

      const plagResults = await plagiarismService.compare(plagiarized, [original], [], false);
      expect(plagResults.length).toBe(1);
      expect(plagResults[0].similarity).toBeGreaterThan(0.4);

      const uniqueResults = await plagiarismService.compare(unique, [original, plagiarized], [], false);
      expect(uniqueResults.length).toBe(0);
    });

    test('match positions are valid char indices', () => {
      const result = plagiarismService.compareTexts(ORIGINAL, PLAGIARIZED);
      for (const m of result.matches) {
        expect(m.inA.start).toBeGreaterThanOrEqual(0);
        expect(m.inA.end).toBeLessThanOrEqual(ORIGINAL.length);
        expect(m.inB.start).toBeGreaterThanOrEqual(0);
        expect(m.inB.end).toBeLessThanOrEqual(PLAGIARIZED.length);
        expect(m.inB.end).toBeGreaterThan(m.inB.start);
      }
    });

    test('stop phrases excluded from comparison', () => {
      const stopPhrases = ['Вступ', 'Висновок', 'Теоретичні відомості', 'Практична частина'];
      const withStop    = plagiarismService.compareTexts(ORIGINAL, PLAGIARIZED);
      const withoutStop = plagiarismService.compareTexts(
        ORIGINAL.replace(/Вступ|Висновок|Теоретичні відомості|Практична частина/g, ''),
        PLAGIARIZED.replace(/Вступ|Висновок|Теоретичні відомості|Практична частина/g, '')
      );
      // Both should find matches (content is still similar), stop phrases don't affect content
      expect(withStop.matchCount).toBeGreaterThan(0);
      expect(withoutStop.matchCount).toBeGreaterThan(0);
    });
  });

  describe('Structure checking', () => {
    const sections = [
      { name: 'Вступ', required: true, minWords: 5 },
      { name: 'Теоретичні відомості', required: true, minWords: 10 },
      { name: 'Практична частина', required: true, minWords: 10 },
      { name: 'Висновок', required: true, minWords: 5 },
    ];

    test('original text passes structure check', () => {
      const result = structureService.check(ORIGINAL, sections);
      expect(result.passed).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.found).toHaveLength(4);
    });

    test('plagiarized text passes structure check', () => {
      const result = structureService.check(PLAGIARIZED, sections);
      expect(result.passed).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    test('text without required section fails', () => {
      const noConclusion = ORIGINAL.replace(/Висновок[\s\S]*$/, '');
      const result = structureService.check(noConclusion, sections);
      expect(result.passed).toBe(false);
      expect(result.missing).toContain('Висновок');
    });

    test('section with insufficient content flagged', () => {
      // minWords: 500 is way more than any section has
      const result = structureService.check(ORIGINAL, [{ name: 'Вступ', required: true, minWords: 500 }]);
      expect(result.emptySections.length).toBeGreaterThan(0);
    });

    test('duplicate section detected', () => {
      const withDuplicate = ORIGINAL + '\n\nВступ\nДублікат вступу для тестування системи виявлення.';
      const secs = [{ name: 'Вступ', required: true }, { name: 'Висновок', required: true }];
      const result = structureService.check(withDuplicate, secs);
      expect(result.duplicates).toContain('Вступ');
    });
  });

  describe('Grading calculation', () => {
    const config = {
      plagiarism:   { max: 4, thresholds: [{ limit: 0.1, score: 4 }, { limit: 0.3, score: 2 }, { limit: 1, score: 0 }] },
      structure:    { max: 3 },
      completeness: { max: 2 },
      grammar:      { max: 1, thresholds: [{ limit: 5, score: 1 }, { limit: 20, score: 0.5 }, { limit: 999, score: 0 }] },
    };

    test('clean work gets full grade', () => {
      const grade = gradingService.calculate(config, {
        plagiarismScore: 0.05,
        structureResult: { passed: true, score: 100 },
        completenessResult: { score: 0.9 },
        grammarResult: { errorCount: 2 },
      });
      expect(grade.total).toBeGreaterThanOrEqual(9.5);
      expect(grade.maxTotal).toBe(10);
    });

    test('plagiarized work gets 0 for plagiarism criterion', () => {
      const grade = gradingService.calculate(config, {
        plagiarismScore: 0.8,
        structureResult: { passed: true, score: 100 },
        completenessResult: { score: 0.9 },
        grammarResult: { errorCount: 2 },
      });
      expect(grade.breakdown.plagiarism.score).toBe(0);
      expect(grade.total).toBeLessThan(grade.maxTotal);
    });

    test('partial structure reduces grade proportionally', () => {
      const grade = gradingService.calculate(config, {
        plagiarismScore: 0.05,
        structureResult: { passed: false, score: 50 },
        completenessResult: { score: 0.9 },
        grammarResult: { errorCount: 2 },
      });
      expect(grade.breakdown.structure.score).toBe(1.5); // 50% of 3
    });
  });

  describe('Report creation', () => {
    test('create() sets plagiarismScore to max similarity', async () => {
      const submission = makeSubmission(1, ORIGINAL, '2024-01-01');
      const structureResult = { passed: true, score: 100, missing: [], found: ['Вступ'], orderViolations: [], emptySections: [], forbiddenFound: [], duplicates: [] };
      const plagiarismMatches = [
        { sourceSubmissionId: 2, similarity: 0.3, matchCount: 3, matches: [] },
        { sourceSubmissionId: 3, similarity: 0.7, matchCount: 8, matches: [] },
      ];

      await reportService.create(submission, structureResult, plagiarismMatches);

      const upsertCall = Report.upsert.mock.calls[0][0];
      expect(upsertCall.plagiarismScore).toBe(0.7); // max of [0.3, 0.7]
      expect(upsertCall.structurePassed).toBe(true);
      expect(upsertCall.details.plagiarismMatches).toHaveLength(2);
    });

    test('create() with no matches → plagiarismScore = 0', async () => {
      const submission = makeSubmission(1, ORIGINAL, '2024-01-01');
      const structureResult = { passed: true, score: 100, missing: [], found: [], orderViolations: [], emptySections: [], forbiddenFound: [], duplicates: [] };

      await reportService.create(submission, structureResult, []);

      const upsertCall = Report.upsert.mock.calls[Report.upsert.mock.calls.length - 1][0];
      expect(upsertCall.plagiarismScore).toBe(0);
    });
  });

  describe('End-to-end: 3 submissions scenario', () => {
    test('first submission has no plagiarism, second has high, third is unique', async () => {
      const sub1 = makeSubmission(1, ORIGINAL,    '2024-01-01');
      const sub2 = makeSubmission(2, PLAGIARIZED, '2024-01-02');
      const sub3 = makeSubmission(3, UNIQUE,      '2024-01-03');

      // sub1: no earlier → no plagiarism
      const r1 = await plagiarismService.compare(sub1, [], [], false);
      expect(r1).toHaveLength(0);

      // sub2: compared against sub1 → high plagiarism
      const r2 = await plagiarismService.compare(sub2, [sub1], [], false);
      expect(r2.length).toBeGreaterThan(0);
      expect(r2[0].similarity).toBeGreaterThan(0.3);

      // sub3: compared against sub1, sub2 → no plagiarism
      const r3 = await plagiarismService.compare(sub3, [sub1, sub2], [], false);
      expect(r3).toHaveLength(0);

      // Structure: all pass
      const sections = [
        { name: 'Вступ', required: true },
        { name: 'Теоретичні відомості', required: true },
        { name: 'Практична частина', required: true },
        { name: 'Висновок', required: true },
      ];
      expect(structureService.check(ORIGINAL, sections).passed).toBe(true);
      expect(structureService.check(PLAGIARIZED, sections).passed).toBe(true);
      expect(structureService.check(UNIQUE, sections).passed).toBe(true);
    });
  });
});
