const { Submission, Assignment } = require('../models');
const pdfService = require('./pdf.service');
const plagiarismService = require('./plagiarism.service');
const structureService = require('./structure.service');
const grammarService = require('./grammar.service');
const completenessService = require('./completeness.service');
const gradingService = require('./grading.service');
const extractService = require('./extract.service');
const reportService = require('./report.service');
const notificationService = require('./notification.service');

exports.runAll = async (assignmentId, teacher) => {
  const assignment = await Assignment.findByPk(assignmentId);
  const submissions = await Submission.findAll({
    where: { assignmentId },
    order: [['submittedAt', 'ASC']],
  });

  const results = [];

  for (const submission of submissions) {
    // 1. Extract text
    if (!submission.extractedText && submission.fileUrl) {
      try {
        const text = await pdfService.extractText(teacher, submission.fileUrl);

        // PDF with only scanned images returns empty or very short text
        const minLength = assignment.minTextLength ?? 100;
        if (!text || text.trim().length < minLength) {
          await submission.update({ status: 'failed' });
          await notificationService.notifyStudent(
            submission.id,
            `Не вдалося отримати достатньо тексту з вашої роботи (знайдено ${text.trim().length} символів, потрібно мінімум ${minLength}). PDF містить лише зображення або роботу не заповнено. Будь ласка, перездайте.`
          );
          results.push({ submissionId: submission.id, status: 'failed', error: 'Insufficient text' });
          continue;
        }

        await submission.update({ extractedText: text, status: 'text_extracted' });
      } catch (err) {
        if (err.code === 'FILE_TOO_LARGE') {
          await submission.update({ status: 'too_large' });
          await notificationService.notifyStudent(
            submission.id,
            `Ваша робота не може бути перевірена: ${err.message} Будь ласка, стисніть PDF або перездайте меншим файлом.`
          );
          results.push({ submissionId: submission.id, status: 'too_large', error: err.message });
        } else {
          await submission.update({ status: 'failed' });
          await notificationService.notifyStudent(
            submission.id,
            'Не вдалося отримати текст з вашої роботи. Будь ласка, перездайте у форматі PDF.'
          );
          results.push({ submissionId: submission.id, status: 'failed', error: err.message });
        }
        continue;
      }
    }

    // 2. Structure check
    const structureResult = structureService.check(
      submission.extractedText,
      assignment.structureRequirements
    );
    await submission.update({ structureResult });

    // 3. Plagiarism
    const earlier = submissions.filter(
      s => s.submittedAt < submission.submittedAt && s.extractedText
    );
    const plagiarismMatches = await plagiarismService.compare(submission, earlier, assignment.stopPhrases || []);

    // 4. Grammar check (non-fatal — skip if LanguageTool unavailable)
    let grammarResult = null;
    try {
      grammarResult = await grammarService.check(submission.extractedText);
    } catch {
      console.warn(`[Grammar] LanguageTool unavailable for submission ${submission.id}`);
    }

    // 5. Completeness check — use referenceText (etalon) if available, else description, else title
    let completenessResult = null;
    try {
      const referenceText = assignment.referenceText || assignment.description || assignment.title;
      completenessResult = await completenessService.check(submission.extractedText, referenceText);
    } catch (err) {
      console.warn(`[Completeness] Failed for submission ${submission.id}:`, err.message);
    }

    // 6. Calculate grade
    const grade = gradingService.calculate(assignment.gradingConfig, {
      plagiarismScore: plagiarismMatches.length ? Math.max(...plagiarismMatches.map(m => m.similarity)) : 0,
      structureResult,
      completenessResult,
      grammarResult,
    });

    // 7. Save report
    const extractedFields = extractService.extract(submission.extractedText, assignment.extractFields || []);
    const report = await reportService.create(submission, structureResult, plagiarismMatches, grammarResult, completenessResult, grade, extractedFields);

    await submission.update({ status: 'checked' });
    results.push({ submissionId: submission.id, status: 'checked', report });
  }

  return results;
};

/**
 * Run checks only for selected submission IDs.
 * Still compares against ALL submissions of the assignment for plagiarism accuracy.
 */
exports.runSelected = async (assignmentId, submissionIds, teacher) => {
  const { Assignment, Submission } = require('../models');
  const assignment = await Assignment.findByPk(assignmentId);

  // Load all submissions for plagiarism comparison context
  const allSubmissions = await Submission.findAll({
    where: { assignmentId },
    order: [['submittedAt', 'ASC']],
  });

  const selected = allSubmissions.filter(s => submissionIds.includes(s.id));
  if (!selected.length) return [];

  // Temporarily override the submissions list to only process selected ones
  // but keep allSubmissions for plagiarism context
  const results = [];

  for (const submission of selected) {
    // 1. Extract text
    if (!submission.extractedText && submission.fileUrl) {
      try {
        const text = await pdfService.extractText(teacher, submission.fileUrl);
        const minLength = assignment.minTextLength ?? 100;
        if (!text || text.trim().length < minLength) {
          await submission.update({ status: 'failed' });
          results.push({ submissionId: submission.id, status: 'failed', error: 'Insufficient text' });
          continue;
        }
        await submission.update({ extractedText: text, status: 'text_extracted' });
      } catch (err) {
        await submission.update({ status: err.code === 'FILE_TOO_LARGE' ? 'too_large' : 'failed' });
        results.push({ submissionId: submission.id, status: submission.status, error: err.message });
        continue;
      }
    }

    const structureResult = structureService.check(submission.extractedText, assignment.structureRequirements);
    await submission.update({ structureResult });

    const earlier = allSubmissions.filter(s => s.submittedAt < submission.submittedAt && s.extractedText);
    const plagiarismMatches = await plagiarismService.compare(submission, earlier, assignment.stopPhrases || []);

    let grammarResult = null;
    try { grammarResult = await grammarService.check(submission.extractedText); } catch {}

    let completenessResult = null;
    try {
      const ref = assignment.referenceText || assignment.description || assignment.title;
      completenessResult = await completenessService.check(submission.extractedText, ref);
    } catch {}

    const grade = gradingService.calculate(assignment.gradingConfig, {
      plagiarismScore: plagiarismMatches.length ? Math.max(...plagiarismMatches.map(m => m.similarity)) : 0,
      structureResult, completenessResult, grammarResult,
    });

    const report = await reportService.create(submission, structureResult, plagiarismMatches, grammarResult, completenessResult, grade);
    await submission.update({ status: 'checked' });
    results.push({ submissionId: submission.id, status: 'checked', report });
  }

  return results;
};
