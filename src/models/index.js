const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

const User = require('./user.model')(sequelize);
const Course = require('./course.model')(sequelize);
const Assignment = require('./assignment.model')(sequelize);
const Submission = require('./submission.model')(sequelize);
const PlagiarismResult = require('./plagiarismResult.model')(sequelize);
const Report = require('./report.model')(sequelize);

// Associations
User.hasMany(Course, { foreignKey: 'teacherId', as: 'taughtCourses' });
Course.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });

Course.hasMany(Assignment, { foreignKey: 'courseId', as: 'assignments' });
Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

User.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Submission.hasOne(Report, { foreignKey: 'submissionId', as: 'report' });
Report.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

Submission.hasMany(PlagiarismResult, { foreignKey: 'sourceSubmissionId', as: 'plagiarismAsSource' });
Submission.hasMany(PlagiarismResult, { foreignKey: 'targetSubmissionId', as: 'plagiarismAsTarget' });

module.exports = { sequelize, User, Course, Assignment, Submission, PlagiarismResult, Report };
