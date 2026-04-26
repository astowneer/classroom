const classroomService = require('../services/classroom.service');
const { Course } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const courses = await Course.findAll({ where: { teacherId: req.user.id } });
    res.json(courses);
  } catch (err) { next(err); }
};

exports.syncFromClassroom = async (req, res, next) => {
  try {
    const courses = await classroomService.syncCourses(req.user);
    res.json(courses);
  } catch (err) { next(err); }
};
