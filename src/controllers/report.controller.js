const reportService = require('../services/report.service');
const { Report, Submission, User } = require('../models');

exports.get = async (req, res, next) => {
  try {
    const report = await Report.findOne({ where: { submissionId: req.params.submissionId } });
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json(report);
  } catch (err) { next(err); }
};

// Summary table for all submissions of an assignment
exports.getByAssignment = async (req, res, next) => {
  try {
    const submissions = await Submission.findAll({
      where: { assignmentId: req.params.assignmentId },
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: Report, as: 'report', attributes: ['plagiarismScore', 'structurePassed', 'sentToStudent'] },
      ],
      group: ['Submission.id', 'student.id', 'report.id'],
    });

    const table = submissions.map(s => ({
      submissionId: s.id,
      student: s.student,
      status: s.status,
      submittedAt: s.submittedAt,
      plagiarismScore: s.report ? (s.report.plagiarismScore * 100).toFixed(1) + '%' : null,
      structurePassed: s.report?.structurePassed ?? null,
      sentToStudent: s.report?.sentToStudent ?? false,
    }));

    res.json(table);
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    const buffer = await reportService.generatePdf(req.params.submissionId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.submissionId}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
