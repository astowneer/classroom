const classroomService = require('../services/classroom.service');
const { Course } = require('../models');

exports.list = async (req, res) => {
  const courses = await Course.findAll({ where: { teacherId: req.user.id } });
  res.json(courses);
};

exports.syncFromClassroom = async (req, res) => {
  const courses = await classroomService.syncCourses(req.user);
  res.json(courses);
};
