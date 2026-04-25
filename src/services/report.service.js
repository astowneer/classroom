const { Report } = require('../models');

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
  // TODO: implement PDF generation (e.g. with pdfkit)
  throw new Error('PDF generation not yet implemented');
};
