const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Submission', {
  googleSubmissionId: { type: DataTypes.STRING, unique: true, allowNull: true },
  assignmentId:       { type: DataTypes.INTEGER },
  studentId:          { type: DataTypes.INTEGER },
  fileUrl:            { type: DataTypes.TEXT },
  localFilePath:      { type: DataTypes.TEXT },   // uploaded directly by student
  extractedText:      { type: DataTypes.TEXT },
  originalText:       { type: DataTypes.TEXT },  // preserved original, never overwritten
  resubmitText:       { type: DataTypes.TEXT },   // text from resubmitted file (keeps original intact)
  submittedAt:        { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM(
      'pending', 'text_extracted', 'checked', 'failed', 'too_large',
      'resubmit_pending', 'resubmit_checked',
    ),
    defaultValue: 'pending',
  },
  structureResult:    { type: DataTypes.JSON },
  teacherComment:     { type: DataTypes.TEXT },   // teacher accept/reject comment
});
