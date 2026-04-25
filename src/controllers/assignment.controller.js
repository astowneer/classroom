const { Assignment } = require('../models');

exports.list = async (req, res) => {
  const { courseId } = req.query;
  const where = courseId ? { courseId } : {};
  const assignments = await Assignment.findAll({ where });
  res.json(assignments);
};

exports.get = async (req, res) => {
  const assignment = await Assignment.findByPk(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  res.json(assignment);
};

exports.updateStructureRequirements = async (req, res) => {
  const assignment = await Assignment.findByPk(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });
  await assignment.update({ structureRequirements: req.body.sections });
  res.json(assignment);
};
