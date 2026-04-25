const { Submission, Assignment } = require('../models');
const pdfService = require('./pdf.service');
const plagiarismService = require('./plagiarism.service');
const structureService = require('./structure.service');
const reportService = require('./report.service');
const notificationService = require('./notification.service');

exports.runAll = async (assignmentId) => {
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
        const text = await pdfService.extractText(submission.fileUrl);
        await submission.update({ extractedText: text, status: 'text_extracted' });
      } catch {
        await submission.update({ status: 'failed' });
        await notificationService.notifyStudent(submission.id, 'Не вдалося отримати текст з вашої роботи. Будь ласка, перездайте.');
        results.push({ submissionId: submission.id, status: 'failed' });
        continue;
      }
    }

    // 2. Structure check
    const structureResult = structureService.check(
      submission.extractedText,
      assignment.structureRequirements
    );
    await submission.update({ structureResult });

    // 3. Plagiarism check (compare against earlier submissions that were already checked)
    const earlier = submissions.filter(s => s.submittedAt < submission.submittedAt && s.extractedText);
    const plagiarismMatches = await plagiarismService.compare(submission, earlier);

    // 4. Generate report
    const report = await reportService.create(submission, structureResult, plagiarismMatches);

    await submission.update({ status: 'checked' });
    results.push({ submissionId: submission.id, status: 'checked', report });
  }

  return results;
};
