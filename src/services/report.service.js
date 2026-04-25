const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Report, Submission, User, Assignment } = require('../models');

const FONT = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

exports.create = async (submission, structureResult, plagiarismMatches) => {
  const plagiarismScore = plagiarismMatches.length
    ? Math.max(...plagiarismMatches.map(m => m.similarity))
    : 0;

  const [report] = await Report.upsert({
    submissionId: submission.id,
    plagiarismScore,
    structurePassed: structureResult.passed,
    details: { structureResult, plagiarismMatches },
  });

  return report;
};

exports.generatePdf = async (submissionId) => {
  const report = await Report.findOne({
    where: { submissionId },
    include: [
      {
        model: Submission,
        as: 'submission',
        include: [
          { model: User, as: 'student' },
          { model: Assignment, as: 'assignment' },
        ],
      },
    ],
  });

  if (!report) throw Object.assign(new Error('Report not found'), { status: 404 });

  const { submission, details } = report;
  const { structureResult, plagiarismMatches } = details;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('DejaVu', FONT);
    doc.font('DejaVu');
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).text('Звіт перевірки роботи', { align: 'center' });
    doc.moveDown();

    // Student & assignment info
    doc.fontSize(12)
      .text(`Студент: ${submission.student.name || submission.student.email}`)
      .text(`Завдання: ${submission.assignment.title}`)
      .text(`Дата здачі: ${new Date(submission.submittedAt).toLocaleString('uk-UA')}`)
      .moveDown();

    // Structure check
    doc.fontSize(14).text('Перевірка структури', { underline: true });
    doc.fontSize(12).text(`Результат: ${structureResult.passed ? '✓ Пройдено' : '✗ Не пройдено'}`);
    if (structureResult.found?.length) {
      doc.text(`Знайдені розділи: ${structureResult.found.join(', ')}`);
    }
    if (structureResult.missing?.length) {
      doc.text(`Відсутні розділи: ${structureResult.missing.join(', ')}`);
    }
    doc.moveDown();

    // Plagiarism check
    doc.fontSize(14).text('Перевірка на запозичення', { underline: true });
    const scorePercent = (report.plagiarismScore * 100).toFixed(1);
    doc.fontSize(12).text(`Максимальний рівень збігу: ${scorePercent}%`);

    if (plagiarismMatches.length === 0) {
      doc.text('Запозичень не виявлено.');
    } else {
      for (const match of plagiarismMatches) {
        doc.moveDown(0.5)
          .text(`Збіг з роботою #${match.sourceSubmissionId}: ${(match.similarity * 100).toFixed(1)}%`)
          .text(`Кількість збігів: ${match.matchCount ?? match.matches?.length ?? 0}`);

        if (match.matches?.length) {
          doc.moveDown(0.3).fontSize(10);
          for (const m of match.matches.slice(0, 5)) {
            doc.text(`  — "${m.targetText.substring(0, 120)}..."`, { indent: 10 });
          }
          if (match.matches.length > 5) {
            doc.text(`  ... та ще ${match.matches.length - 5} збігів`, { indent: 10 });
          }
          doc.fontSize(12);
        }
      }
    }

    doc.end();
  });
};
