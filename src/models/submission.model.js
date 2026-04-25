const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Submission', {
  googleSubmissionId: { type: DataTypes.STRING, unique: true, allowNull: true },
  assignmentId:       { type: DataTypes.INTEGER },
  studentId:          { type: DataTypes.INTEGER },
  fileUrl:            { type: DataTypes.TEXT },
  localFilePath:      { type: DataTypes.TEXT },   // uploaded directly by student
  extractedText:      { type: DataTypes.TEXT },
  submittedAt:        { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM(
      'pending', 'text_extracted', 'checked', 'failed', 'too_large',
      'resubmit_pending', 'resubmit_checked', 'resubmit_review',
      'resubmit_accepted', 'resubmit_rejected',
    ),
    defaultValue: 'pending',
  },
  structureResult:    { type: DataTypes.JSON },
  teacherComment:     { type: DataTypes.TEXT },   // teacher accept/reject comment
});
