const reportService = require('../services/report.service');
const { Report, Submission, User, Assignment } = require('../models');

// Teacher sees all, student sees only their own
async function canAccess(submissionId, user) {
  if (user.role === 'teacher') return true;
  const submission = await Submission.findByPk(submissionId);
  return submission && submission.studentId === user.id;
}

exports.get = async (req, res, next) => {
  try {
    if (!await canAccess(req.params.submissionId, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const report = await Report.findOne({
      where: { submissionId: req.params.submissionId },
      include: [{
        model: Submission, as: 'submission',
        include: [
          { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
          { model: Assignment, as: 'assignment', attributes: ['id', 'title', 'stopPhrases'] },
        ],
      }],
    });
    if (!report) return res.status(404).json({ error: 'Not found' });
    res.json(report);
  } catch (err) { next(err); }
};

exports.getByAssignment = async (req, res, next) => {
  try {
    const where = { assignmentId: req.params.assignmentId };
    if (req.user.role === 'student') where.studentId = req.user.id;

    const submissions = await Submission.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
        { model: Report, as: 'report', attributes: ['plagiarismScore', 'structurePassed', 'sentToStudent', 'grade'] },
      ],
      group: ['Submission.id', 'student.id', 'report.id'],
    });

    // Get unread message counts for each submission
    const { Message } = require('../models');
    const { Op, fn, col } = require('sequelize');
    const unreadRows = await Message.findAll({
      where: {
        submissionId: submissions.map(s => s.id),
        read: false,
        senderId: { [Op.ne]: req.user.id },
      },
      attributes: ['submissionId', [fn('COUNT', col('id')), 'count']],
      group: ['submissionId'],
      raw: true,
    });
    const unreadMap = Object.fromEntries(unreadRows.map(r => [r.submissionId, parseInt(r.count)]));

    const table = submissions.map(s => ({
      submissionId: s.id,
      student: s.student,
      status: s.status,
      submittedAt: s.submittedAt,
      plagiarismScore: s.report ? (s.report.plagiarismScore * 100).toFixed(1) + '%' : null,
      structurePassed: s.report?.structurePassed ?? null,
      sentToStudent: s.report?.sentToStudent ?? false,
      grade: s.report?.grade ?? null,
      unreadMessages: unreadMap[s.id] || 0,
    }));

    res.json(table);
  } catch (err) { next(err); }
};

exports.download = async (req, res, next) => {
  try {
    if (!await canAccess(req.params.submissionId, req.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const buffer = await reportService.generatePdf(req.params.submissionId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.submissionId}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};
