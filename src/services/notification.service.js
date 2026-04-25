const { Submission, User } = require('../models');

/**
 * Notify student about their submission result.
 * Currently logs to console; replace with email/Google Classroom comment as needed.
 */
exports.notifyStudent = async (submissionId, message) => {
  const submission = await Submission.findByPk(submissionId, { include: 'User' });
  console.log(`[Notification] -> ${submission.User.email}: ${message}`);
  // TODO: integrate nodemailer or Google Classroom private comment API
};
