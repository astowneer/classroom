const classroomService = require('../services/classroom.service');
const checkService = require('../services/check.service');
const notificationService = require('../services/notification.service');
const { Submission } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { assignmentId } = req.query;
    const where = assignmentId ? { assignmentId } : {};
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
    await notificationService.notifyStudent(req.params.id, req.body.message);
    res.json({ success: true });
  } catch (err) { next(err); }
};
