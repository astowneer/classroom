const { google } = require('googleapis');
const { Course, Assignment, Submission, User, Report, PlagiarismResult } = require('../models');

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
  const { data } = await classroom.courses.list({ teacherId: 'me', courseStates: ['ACTIVE'] });
  const courses = data.courses || [];

  return Promise.all(courses.map(async (c) => {
    const [course] = await Course.upsert({ googleCourseId: c.id, name: c.name, teacherId: user.id });
    return course;
  }));
};

exports.syncAssignments = async (user, courseId) => {
  const course = await Course.findByPk(courseId);
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });

  const classroom = getClient(user);
  const { data } = await classroom.courses.courseWork.list({
    courseId: course.googleCourseId,
    courseWorkStates: ['PUBLISHED'],
  });
  const courseWorks = data.courseWork || [];

  return Promise.all(courseWorks.map(async (cw) => {
    const [assignment] = await Assignment.upsert({
      googleAssignmentId: cw.id,
      title: cw.title,
      courseId: course.id,
    });
    return assignment;
  }));
};

exports.syncSubmissions = async (user, assignmentId) => {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: Course, as: 'course' }],
  });
  if (!assignment) throw Object.assign(new Error('Assignment not found'), { status: 404 });

  const classroom = getClient(user);
  const { data } = await classroom.courses.courseWork.studentSubmissions.list({
    courseId: assignment.course.googleCourseId,
    courseWorkId: assignment.googleAssignmentId,
    states: ['TURNED_IN', 'RETURNED'],
  });

  const submissions = data.studentSubmissions || [];
  return Promise.all(submissions.map(async (s) => {
    // Fetch student profile for real email and name
    let email = `${s.userId}@classroom.google.com`;
    let name = null;
    try {
      const { data: profile } = await classroom.userProfiles.get({ userId: s.userId });
      email = profile.emailAddress || email;
      name = profile.name?.fullName || null;
    } catch { /* profile may be restricted */ }

    const [student] = await User.findOrCreate({
      where: { googleId: s.userId },
      defaults: { email, name, role: 'student' },
    });

    // Update name/email if they were missing before
    if (!student.name && name) await student.update({ name, email });

    const attachment = s.assignmentSubmission?.attachments?.[0]?.driveFile;
    const newFileUrl = attachment ? `https://drive.google.com/uc?export=download&id=${attachment.id}` : null;

    const existing = await Submission.findOne({ where: { googleSubmissionId: s.id } });
    const fileChanged = existing && existing.fileUrl !== newFileUrl;

    if (fileChanged) {
      await Report.destroy({ where: { submissionId: existing.id } });
      await PlagiarismResult.destroy({ where: { targetSubmissionId: existing.id } });
      await existing.update({
        fileUrl: newFileUrl,
        submittedAt: s.updateTime,
        extractedText: null,
        status: 'pending',
        structureResult: null,
      });
      return existing;
    }

    const [submission] = await Submission.upsert({
      googleSubmissionId: s.id,
      assignmentId,
      studentId: student.id,
      fileUrl: newFileUrl,
      submittedAt: s.updateTime,
    });
    return submission;
  }));
};
