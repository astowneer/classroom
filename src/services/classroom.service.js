const { google } = require('googleapis');
const { Course, Assignment, Submission, User } = require('../models');

function getClient(user) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ access_token: user.accessToken, refresh_token: user.refreshToken });
  return google.classroom({ version: 'v1', auth });
}

exports.syncCourses = async (user) => {
  const classroom = getClient(user);
  const { data } = await classroom.courses.list({ teacherId: 'me' });
  const courses = data.courses || [];

  return Promise.all(courses.map(c =>
    Course.upsert({ googleCourseId: c.id, name: c.name, teacherId: user.id })
  ));
};

exports.syncSubmissions = async (user, assignmentId) => {
  const assignment = await Assignment.findByPk(assignmentId, { include: 'Course' });
  const classroom = getClient(user);

  const { data } = await classroom.courses.courseWork.studentSubmissions.list({
    courseId: assignment.Course.googleCourseId,
    courseWorkId: assignment.googleAssignmentId,
  });

  const submissions = data.studentSubmissions || [];
  return Promise.all(submissions.map(async (s) => {
    const [student] = await User.findOrCreate({
      where: { googleId: s.userId },
      defaults: { email: `${s.userId}@classroom`, role: 'student' },
    });

    const attachment = s.assignmentSubmission?.attachments?.[0]?.driveFile;
    return Submission.upsert({
      googleSubmissionId: s.id,
      assignmentId,
      studentId: student.id,
      fileUrl: attachment ? `https://drive.google.com/file/d/${attachment.id}` : null,
      submittedAt: s.updateTime,
    });
  }));
};
