const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Report, Submission, User, Assignment, PlagiarismResult } = require('../models');

const FONT = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// Palette of highlight colors per source student
const COLORS = ['#FFD700', '#90EE90', '#FFB6C1', '#ADD8E6', '#FFA07A', '#DDA0DD', '#98FB98'];

exports.create = async (submission, structureResult, plagiarismMatches, grammarResult = null, completenessResult = null, grade = null) => {
  const plagiarismScore = plagiarismMatches.length
    ? Math.max(...plagiarismMatches.map(m => m.similarity))
    : 0;

  const [report] = await Report.upsert({
    submissionId: submission.id,
    plagiarismScore,
    structurePassed: structureResult.passed,
    details: { structureResult, plagiarismMatches, grammarResult, completenessResult },
    grade,
  });

  return report;
};

exports.generatePdf = async (submissionId) => {
  const report = await Report.findOne({
    where: { submissionId },
    include: [{
      model: Submission, as: 'submission',
      include: [
        { model: User, as: 'student' },
        { model: Assignment, as: 'assignment' },
      ],
    }],
  });
  if (!report) throw Object.assign(new Error('Report not found'), { status: 404 });

  const { submission, details } = report;
  const { structureResult, plagiarismMatches } = details;
  const fullText = submission.extractedText || '';

  // Load source student names for each plagiarism match
  const sourceStudents = {};
  for (const match of plagiarismMatches) {
    const src = await Submission.findByPk(match.sourceSubmissionId, {
      include: [{ model: User, as: 'student' }],
    });
    if (src) sourceStudents[match.sourceSubmissionId] = src.student.name || src.student.email;
  }

  // Build highlight map: array of { start, end, color, studentName }
  const highlights = [];
  plagiarismMatches.forEach((match, idx) => {
    const color = COLORS[idx % COLORS.length];
    const studentName = sourceStudents[match.sourceSubmissionId] || `#${match.sourceSubmissionId}`;
    for (const m of (match.matches || [])) {
      if (m.start >= 0 && m.end > m.start) {
        highlights.push({ start: m.start, end: m.end, color, studentName });
      }
    }
  });
  // Sort by position
  highlights.sort((a, b) => a.start - b.start);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('DejaVu', FONT);
    doc.font('DejaVu');
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────
    doc.fontSize(16).text('Звіт перевірки роботи', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11)
      .text(`Студент: ${submission.student.name || submission.student.email}`)
      .text(`Завдання: ${submission.assignment.title}`)
      .text(`Дата здачі: ${new Date(submission.submittedAt).toLocaleString('uk-UA')}`);
    doc.moveDown();

    // ── Structure result ─────────────────────────────────────
    doc.fontSize(13).text('Перевірка структури', { underline: true });
    doc.fontSize(11).text(`Результат: ${structureResult.passed ? '✓ Пройдено' : '✗ Не пройдено'}`);
    if (structureResult.score !== undefined) doc.text(`Оцінка структури: ${structureResult.score}%`);
    if (structureResult.missing?.length)  doc.text(`Відсутні розділи: ${structureResult.missing.join(', ')}`);
    if (structureResult.orderViolations?.length) doc.text(`Порушення порядку: ${structureResult.orderViolations.join('; ')}`);
    if (structureResult.emptySections?.length) {
      const names = structureResult.emptySections.map(s => typeof s === 'object' ? `${s.name} (${s.wordCount}/${s.required} сл.)` : s);
      doc.text(`Недостатній обсяг: ${names.join(', ')}`);
    }
    doc.moveDown();

    // ── Plagiarism summary ───────────────────────────────────
    doc.fontSize(13).text('Перевірка на запозичення', { underline: true });
    doc.fontSize(11).text(`Максимальний рівень збігу: ${(report.plagiarismScore * 100).toFixed(1)}%`);

    if (plagiarismMatches.length === 0) {
      doc.text('Запозичень не виявлено.');
    } else {
      // Legend
      doc.moveDown(0.3);
      plagiarismMatches.forEach((match, idx) => {
        const color = COLORS[idx % COLORS.length];
        const name = sourceStudents[match.sourceSubmissionId] || `#${match.sourceSubmissionId}`;
        const count = match.matches?.length ?? 0;
        // Draw color swatch
        doc.rect(doc.x, doc.y + 2, 12, 10).fill(color).stroke();
        doc.fillColor('black').text(`  ${name} — ${(match.similarity * 100).toFixed(1)}% (${count} збігів)`, doc.x + 16, doc.y - 10);
      });
    }
    doc.moveDown();

    // ── Completeness check ───────────────────────────────────
    const completenessResult = details.completenessResult;
    if (completenessResult?.score !== null && completenessResult?.score !== undefined) {
      doc.fontSize(13).text('Повнота розкриття теми', { underline: true });
      doc.fontSize(11)
        .text(`Оцінка: ${(completenessResult.score * 100).toFixed(1)}%`)
        .text(`Висновок: ${completenessResult.label}`);
      doc.moveDown();
    }

    // ── Grammar check ────────────────────────────────────────
    const grammarResult = details.grammarResult;
    if (grammarResult) {
      doc.fontSize(13).text('Перевірка граматики', { underline: true });
      doc.fontSize(11).text(`Знайдено помилок: ${grammarResult.errorCount}`);
      if (grammarResult.errors?.length) {
        doc.moveDown(0.3).fontSize(10);
        for (const err of grammarResult.errors.slice(0, 20)) {
          doc.text(`• ${err.message}`, { indent: 10 });
          doc.text(`  «${err.context.substring(0, 80)}»`, { indent: 20 });
          if (err.replacements?.length) {
            doc.text(`  Пропозиція: ${err.replacements.join(', ')}`, { indent: 20 });
          }
        }
        if (grammarResult.errors.length > 20) {
          doc.text(`  ... та ще ${grammarResult.errors.length - 20} помилок`, { indent: 10 });
        }
        doc.fontSize(11);
      }
      doc.moveDown();
    }

    // ── Full text with highlights ────────────────────────────
    doc.fontSize(13).text('Текст роботи', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    if (highlights.length === 0) {
      doc.fillColor('black').text(fullText);
    } else {
      // Render text segments with inline color highlights
      let cursor = 0;
      for (const h of highlights) {
        // Text before highlight
        if (cursor < h.start) {
          doc.fillColor('black').text(fullText.slice(cursor, h.start), { continued: true });
        }
        // Highlighted text + footnote marker
        doc.fillColor(darken(h.color)).text(fullText.slice(h.start, h.end), { continued: true });
        cursor = h.end;
      }
      // Remaining text
      if (cursor < fullText.length) {
        doc.fillColor('black').text(fullText.slice(cursor));
      } else {
        doc.text(''); // flush continued
      }
    }

    doc.end();
  });
};

// Darken hex color for text readability on white background
function darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 60);
  const g = Math.max(0, ((n >> 8) & 0xff) - 60);
  const b = Math.max(0, (n & 0xff) - 60);
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}
