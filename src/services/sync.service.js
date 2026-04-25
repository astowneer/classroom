const classroomService = require('./classroom.service');
const { Course } = require('../models');

/**
 * Sync all courses and their assignments for a given teacher.
 */
exports.syncAll = async (teacher) => {
  try {
    const courses = await classroomService.syncCourses(teacher);

    for (const course of courses) {
      try {
        await classroomService.syncAssignments(teacher, course.id);
      } catch (err) {
        console.warn(`[Sync] Failed to sync assignments for course ${course.id}:`, err.message);
      }
    }

    console.log(`[Sync] Done for teacher ${teacher.email} — ${courses.length} courses`);
  } catch (err) {
    console.warn(`[Sync] Failed for teacher ${teacher.email}:`, err.message);
  }
};
