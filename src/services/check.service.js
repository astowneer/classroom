const { Submission, Assignment } = require('../models');
const pdfService = require('./pdf.service');
const plagiarismService = require('./plagiarism.service');
const structureService = require('./structure.service');
const grammarService = require('./grammar.service');
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
        await submission.update({ extractedText: text, status: 'text_extracted' });
      } catch (err) {
        await submission.update({ status: 'failed' });
        await notificationService.notifyStudent(
          submission.id,
          'Не вдалося отримати текст з вашої роботи. Будь ласка, перездайте у форматі PDF.'
        );
        results.push({ submissionId: submission.id, status: 'failed', error: err.message });
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
    const plagiarismMatches = await plagiarismService.compare(submission, earlier);

    // 4. Grammar check (non-fatal — skip if LanguageTool unavailable)
    let grammarResult = null;
    try {
      grammarResult = await grammarService.check(submission.extractedText);
    } catch {
      console.warn(`[Grammar] LanguageTool unavailable for submission ${submission.id}`);
    }

    // 5. Save report
    const report = await reportService.create(submission, structureResult, plagiarismMatches, grammarResult);

    await submission.update({ status: 'checked' });
    results.push({ submissionId: submission.id, status: 'checked', report });
  }

  return results;
};
