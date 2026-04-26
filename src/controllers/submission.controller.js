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
    const { Assignment, Course } = require('../models');
    const submissions = await Submission.findAll({
      where,
      include: [{
        model: Assignment, as: 'assignment',
        attributes: ['id', 'title'],
        include: [{ model: Course, as: 'course', attributes: ['id', 'name'] }],
      }],
      order: [['submittedAt', 'DESC']],
    });
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

// POST /submissions/check-selected — check only selected submission IDs
exports.runChecksSelected = async (req, res, next) => {
  try {
    const { submissionIds, assignmentId } = req.body;
    if (!submissionIds?.length || !assignmentId) {
      return res.status(400).json({ error: 'submissionIds and assignmentId required' });
    }
    const results = await checkService.runSelected(assignmentId, submissionIds, req.user);
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
exports.downloadFile = async (req, res, next) => {
  try {
    const submission = await Submission.findByPk(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Not found' });

    // Access check
    if (req.user.role === 'student' && submission.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fileUrl = submission.localFilePath
      ? null  // local file
      : submission.fileUrl;

    if (submission.localFilePath) {
      const fs = require('fs');
      if (!fs.existsSync(submission.localFilePath)) return res.status(404).json({ error: 'File not found' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="submission-${submission.id}.pdf"`);
      return fs.createReadStream(submission.localFilePath).pipe(res);
    }

    if (!fileUrl) return res.status(404).json({ error: 'No file' });

    // Download from Google Drive
    const { google } = require('googleapis');
    const { createAuthClient } = require('../utils/googleAuth');
    const auth = createAuthClient(req.user);
    const drive = google.drive({ version: 'v3', auth });
    const match = fileUrl.match(/[?&]id=([^&]+)/) || fileUrl.match(/\/d\/([^/]+)/);
    if (!match) return res.status(400).json({ error: 'Invalid file URL' });

    const driveRes = await drive.files.get(
      { fileId: match[1], alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-${submission.id}.pdf"`);
    driveRes.data.pipe(res);
  } catch (err) { next(err); }
};

exports.resubmit = async (req, res, next) => {
  try {
    const submission = await Submission.findOne({ where: { id: req.params.id, studentId: req.user.id } });
    if (!submission) return res.status(404).json({ error: 'Not found' });
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });

    const { Resubmission } = require('../models');
    const resub = await Resubmission.create({
      submissionId: submission.id,
      studentId: req.user.id,
      localFilePath: req.file.path,
      status: 'pending',
    });
    // Update original submission status only
    await submission.update({ status: 'resubmit_pending' });
    res.json(resub);
  } catch (err) { next(err); }
};

exports.selfCheck = async (req, res, next) => {
  try {
    const { Resubmission } = require('../models');
    const resub = await Resubmission.findOne({
      where: { submissionId: req.params.id, studentId: req.user.id, status: 'pending' },
      order: [['createdAt', 'DESC']],
    });
    if (!resub) return res.status(404).json({ error: 'No pending resubmission found' });

    const text = await pdfService.extractFromLocalFile(resub.localFilePath);
    const originalSubmission = await Submission.findByPk(req.params.id);
    const assignment = await Assignment.findByPk(originalSubmission.assignmentId);

    const structureResult = structureService.check(text, assignment.structureRequirements);

    // Compare against all checked submissions (using originalText for accuracy)
    const others = await Submission.findAll({
      where: { assignmentId: assignment.id, status: 'checked' },
    });
    const othersWithOriginal = others
      .filter(s => s.id !== originalSubmission.id && (s.originalText || s.extractedText))
      .map(s => ({ ...s.toJSON(), extractedText: s.originalText || s.extractedText }));

    const fakeSubmission = { id: `resub-${resub.id}`, extractedText: text, submittedAt: new Date() };
    const plagiarismMatches = await plagiarismService.compare(fakeSubmission, othersWithOriginal, assignment.stopPhrases || [], false);
    const plagiarismScore = plagiarismMatches.length ? Math.max(...plagiarismMatches.map(m => m.similarity)) : 0;

    // Save results ONLY in Resubmission — does NOT affect teacher's view
    await resub.update({
      extractedText: text,
      structureResult,
      status: 'checked',
      plagiarismScore,
      reportDetails: { structureResult, plagiarismMatches },
    });

    // Do NOT change original submission status or report
    res.json(resub);
  } catch (err) { next(err); }
};

exports.submitForReview = async (req, res, next) => {
  try {
    const { Resubmission } = require('../models');
    const resub = await Resubmission.findOne({
      where: { submissionId: req.params.id, studentId: req.user.id, status: 'checked' },
      order: [['createdAt', 'DESC']],
    });
    if (!resub) return res.status(404).json({ error: 'Not found or not ready' });
    await resub.update({ status: 'review' });
    await Submission.update({ status: 'resubmit_review' }, { where: { id: req.params.id } });
    res.json(resub);
  } catch (err) { next(err); }
};

exports.review = async (req, res, next) => {
  try {
    const { decision, comment } = req.body;
    if (!['accept', 'reject'].includes(decision)) return res.status(400).json({ error: 'decision must be accept or reject' });

    const { Resubmission, Report } = require('../models');
    const resub = await Resubmission.findOne({
      where: { submissionId: req.params.id, status: 'review' },
      order: [['createdAt', 'DESC']],
    });
    if (!resub) return res.status(404).json({ error: 'Not found or not in review' });

    const resubStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const submissionStatus = decision === 'accept' ? 'resubmit_accepted' : 'resubmit_rejected';
    await resub.update({ status: resubStatus, teacherComment: comment || null });
    await Submission.update({ status: submissionStatus }, { where: { id: req.params.id } });

    // If accepted — update main Report and Submission with resubmission data
    if (decision === 'accept' && resub.reportDetails) {
      const { structureResult, plagiarismMatches } = resub.reportDetails;

      // Update extractedText in submission with resubmission text
      // Preserve originalText (first-ever extracted text) for plagiarism baseline
      const sub = await Submission.findByPk(req.params.id);
      await sub.update({
        structureResult,
        extractedText: resub.extractedText,
        // Save original only if not already saved
        ...(sub.originalText ? {} : { originalText: sub.extractedText }),
      });

      // Update main Report with resubmission results
      // Note: we do NOT touch PlagiarismResult table — those belong to the original submission
      // The report details now reflect the resubmission check
      await Report.update({
        plagiarismScore: resub.plagiarismScore ?? 0,
        structurePassed: structureResult?.passed ?? false,
        details: resub.reportDetails,
        grade: resub.grade,
        sentToStudent: false,
      }, { where: { submissionId: req.params.id } });
    }

    const msg = decision === 'accept'
      ? `Вашу переробку прийнято.${comment ? ' ' + comment : ''}`
      : `Вашу переробку відхилено.${comment ? ' Причина: ' + comment : ''}`;
    await notificationService.notifyStudent(req.params.id, msg, req.user);

    res.json(resub);
  } catch (err) { next(err); }
};
