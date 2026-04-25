const classroomService = require('../services/classroom.service');
const checkService = require('../services/check.service');
const notificationService = require('../services/notification.service');
const pdfService = require('../services/pdf.service');
const plagiarismService = require('../services/plagiarism.service');
const structureService = require('../services/structure.service');
const reportService = require('../services/report.service');
const { Submission, Assignment, Report, PlagiarismResult } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { assignmentId, status } = req.query;
    const where = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (status) where.status = status;
    if (req.user.role === 'student') where.studentId = req.user.id;
    const submissions = await Submission.findAll({ where });
    res.json(submissions);
  } catch (err) { next(err); }
};

exports.syncFromClassroom = async (req, res, next) => {
  try {
    const submissions = await classroomService.syncSubmissions(req.user, req.params.assignmentId);
    res.json(submissions);
  } catch (err) { next(err); }
};

exports.runChecks = async (req, res, next) => {
  try {
    const results = await checkService.runAll(req.params.assignmentId, req.user);
    res.json(results);
  } catch (err) { next(err); }
};

exports.notifyStudent = async (req, res, next) => {
  try {
    await notificationService.notifyStudent(req.params.id, req.body.message, req.user);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// POST /submissions/:id/resubmit — student uploads new PDF
exports.resubmit = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      where: { id: req.params.id, studentId: req.user.id },
    });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });

    // Clean up old resubmit results
    await Report.destroy({ where: { submissionId: submission.id } });
    await PlagiarismResult.destroy({ where: { targetSubmissionId: submission.id } });

    await submission.update({
      localFilePath: req.file.path,
      extractedText: null,
      status: 'resubmit_pending',
      structureResult: null,
      teacherComment: null,
    });

    res.json(submission);
  } catch (err) { next(err); }
};

// POST /submissions/:id/self-check — student runs check on their uploaded file
exports.selfCheck = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      where: { id: req.params.id, studentId: req.user.id },
    });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (!submission.localFilePath) return res.status(400).json({ error: 'No file uploaded' });

    // Extract text from local file
    const text = await pdfService.extractFromLocalFile(submission.localFilePath);
    await submission.update({ extractedText: text, status: 'text_extracted' });

    const assignment = await Assignment.findByPk(submission.assignmentId);

    // Structure check
    const structureResult = structureService.check(text, assignment.structureRequirements);
    await submission.update({ structureResult });

    // Plagiarism — compare against all checked submissions of this assignment (excluding self)
    const others = await Submission.findAll({
      where: { assignmentId: submission.assignmentId, status: 'checked' },
    });
    const plagiarismMatches = await plagiarismService.compare(submission, others);

    const report = await reportService.create(submission, structureResult, plagiarismMatches);
    await submission.update({ status: 'resubmit_checked' });

    res.json({ submission, report });
  } catch (err) { next(err); }
};

// POST /submissions/:id/submit-review — student submits for teacher review
exports.submitForReview = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({
      where: { id: req.params.id, studentId: req.user.id, status: 'resubmit_checked' },
    });
    if (!submission) return res.status(404).json({ error: 'Not found or not ready for review' });
    await submission.update({ status: 'resubmit_review' });
    res.json(submission);
  } catch (err) { next(err); }
};

// POST /submissions/:id/review — teacher accepts or rejects
exports.review = async (req, res, next) => {
  try {
    const { decision, comment } = req.body; // decision: 'accept' | 'reject'
    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be accept or reject' });
    }

    const submission = await Submission.findOne({
      where: { id: req.params.id, status: 'resubmit_review' },
    });
    if (!submission) return res.status(404).json({ error: 'Not found or not in review' });

    const status = decision === 'accept' ? 'resubmit_accepted' : 'resubmit_rejected';
    await submission.update({ status, teacherComment: comment || null });

    // Notify student
    const msg = decision === 'accept'
      ? `Вашу переробку прийнято.${comment ? ' ' + comment : ''}`
      : `Вашу переробку відхилено.${comment ? ' Причина: ' + comment : ''}`;
    await notificationService.notifyStudent(submission.id, msg, req.user);

    res.json(submission);
  } catch (err) { next(err); }
};
