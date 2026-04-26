const { google } = require('googleapis');
const { createAuthClient } = require('../utils/googleAuth');
const { Notification, Submission, Assignment, Course, User, Report } = require('../models');

function getClassroomClient(teacher) {
  const auth = createAuthClient(teacher);
  return google.classroom({ version: 'v1', auth });
}

/**
 * Notify student:
 * 1. Save in-app notification (DB)
 * 2. Return submission in Google Classroom (triggers notification to student)
 *    Note: Classroom API does not support private comments — returning the submission
 *    is the only programmatic way to notify a student via Classroom.
 */
exports.notifyStudent = async (submissionId, message, teacher) => {
  const submission = await Submission.findByPk(submissionId, {
    include: [
      { model: User, as: 'student' },
      { model: Assignment, as: 'assignment', include: [{ model: Course, as: 'course' }] },
    ],
  });
  if (!submission) throw Object.assign(new Error('Submission not found'), { status: 404 });

  // 1. In-app notification
  await Notification.create({ userId: submission.studentId, submissionId, message });

  // 2. Post announcement in Google Classroom course
  if (teacher) {
    try {
      const classroom = getClassroomClient(teacher);
      await classroom.courses.announcements.create({
        courseId: submission.assignment.course.googleCourseId,
        requestBody: {
          text: `[${submission.assignment.title}] ${message}`,
          assigneeMode: 'INDIVIDUAL_STUDENTS',
          individualStudentsOptions: {
            studentIds: [submission.student.googleId],
          },
        },
      });
    } catch (err) {
      console.warn('[Classroom announcement failed]', err.message, err.response?.data || '');
    }
  }

  await Report.update({ sentToStudent: true }, { where: { submissionId } });
};

exports.getForUser = async (userId) => {
  return Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
};

exports.markRead = async (notificationId, userId) => {
  await Notification.update({ read: true }, { where: { id: notificationId, userId } });
};
