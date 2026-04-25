const classroomService = require('../services/classroom.service');
const { Assignment } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    const where = courseId ? { courseId } : {};
    const assignments = await Assignment.findAll({ where });
    res.json(assignments);
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    res.json(assignment);
  } catch (err) { next(err); }
};

exports.syncFromClassroom = async (req, res, next) => {
  try {
    const assignments = await classroomService.syncAssignments(req.user, req.params.courseId);
    res.json(assignments);
  } catch (err) { next(err); }
};

exports.updateStructureRequirements = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    await assignment.update({ structureRequirements: req.body.sections });
    res.json(assignment);
  } catch (err) { next(err); }
};

exports.updateDescription = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    await assignment.update({ description: req.body.description });
    res.json(assignment);
  } catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });
    const { minTextLength, description } = req.body;
    await assignment.update({
      ...(minTextLength !== undefined && { minTextLength: parseInt(minTextLength) }),
      ...(description !== undefined && { description }),
    });
    res.json(assignment);
  } catch (err) { next(err); }
};

exports.uploadReference = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Not found' });

    // Use sections from request body if provided (current UI state), else fall back to DB
    let sections = assignment.structureRequirements || [];
    if (req.body.sections) {
      try { sections = JSON.parse(req.body.sections); } catch {}
    }

    const referenceService = require('../services/reference.service');
    const { minTextLength, updatedSections, referenceText, totalChars } =
      await referenceService.analyze(req.file.path, sections);

    await assignment.update({ minTextLength, structureRequirements: updatedSections, referenceText });

    res.json({ minTextLength, totalChars, updatedSections });
  } catch (err) { next(err); }
};
