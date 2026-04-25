const classroomService = require('../services/classroom.service');
const checkService = require('../services/check.service');
const notificationService = require('../services/notification.service');
const { Submission } = require('../models');

exports.list = async (req, res) => {
  const { assignmentId } = req.query;
  const where = assignmentId ? { assignmentId } : {};
  const submissions = await Submission.findAll({ where });
  res.json(submissions);
};

exports.syncFromClassroom = async (req, res) => {
  const submissions = await classroomService.syncSubmissions(req.user, req.params.assignmentId);
  res.json(submissions);
};

exports.runChecks = async (req, res) => {
  const results = await checkService.runAll(req.params.assignmentId);
  res.json(results);
};

exports.notifyStudent = async (req, res) => {
  await notificationService.notifyStudent(req.params.id, req.body.message);
  res.json({ success: true });
};
