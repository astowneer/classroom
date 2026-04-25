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
User.hasMany(Course, { foreignKey: 'teacherId' });
Course.belongsTo(User, { foreignKey: 'teacherId' });

Course.hasMany(Assignment, { foreignKey: 'courseId' });
Assignment.belongsTo(Course, { foreignKey: 'courseId' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId' });

User.hasMany(Submission, { foreignKey: 'studentId' });
Submission.belongsTo(User, { foreignKey: 'studentId' });

Submission.hasOne(Report, { foreignKey: 'submissionId' });
Report.belongsTo(Submission, { foreignKey: 'submissionId' });

Submission.hasMany(PlagiarismResult, { foreignKey: 'sourceSubmissionId' });

module.exports = { sequelize, User, Course, Assignment, Submission, PlagiarismResult, Report };
