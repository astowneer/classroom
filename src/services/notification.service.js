const { Submission, User } = require('../models');

exports.notifyStudent = async (submissionId, message) => {
  const submission = await Submission.findByPk(submissionId, {
    include: [{ model: User, as: 'student' }],
  });
  console.log(`[Notification] -> ${submission.student.email}: ${message}`);
  // TODO: integrate nodemailer or Google Classroom private comment API
};
