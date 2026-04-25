const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Submission', {
  googleSubmissionId: { type: DataTypes.STRING, unique: true },
  assignmentId:       { type: DataTypes.INTEGER },
  studentId:          { type: DataTypes.INTEGER },
  fileUrl:            { type: DataTypes.TEXT },
  extractedText:      { type: DataTypes.TEXT },
  submittedAt:        { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM('pending', 'text_extracted', 'checked', 'failed'),
    defaultValue: 'pending',
  },
  structureResult:    { type: DataTypes.JSON },  // { passed: bool, missing: [] }
});
