const { User, Submission, Assignment, Course } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { role } = req.query;
    const where = role ? { role } : {};
    const users = await User.findAll({ where, attributes: ['id', 'name', 'email', 'role', 'googleId'] });
    res.json(users);
  } catch (err) { next(err); }
};

// GET /users/course/:courseId/students
exports.listByCourse = async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    // Find all students who have submissions in this course
    const submissions = await Submission.findAll({
      include: [{
        model: Assignment, as: 'assignment',
        where: { courseId: req.params.courseId },
        attributes: [],
      }, {
        model: User, as: 'student', attributes: ['id', 'name', 'email', 'googleId', 'variant'],
      }],
      attributes: ['studentId'],
    });

    // Deduplicate by studentId
    const seen = new Set();
    const students = [];
    for (const s of submissions) {
      if (!seen.has(s.studentId)) {
        seen.add(s.studentId);
        students.push(s.student);
      }
    }
    res.json(students);
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/name  { "name": "..." }
exports.updateName = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    await user.update({ name: req.body.name });
    res.json({ id: user.id, name: user.name, email: user.email, variant: user.variant });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id  { "name": "...", "variant": "7" }
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { name, variant } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (variant !== undefined) updates.variant = variant;
    await user.update(updates);
    res.json({ id: user.id, name: user.name, email: user.email, variant: user.variant });
  } catch (err) { next(err); }
};
