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
      'pending', 'text_extracted', 'checked', 'failed',
      'resubmit_pending',   // student uploaded new file, awaiting self-check
      'resubmit_checked',   // self-check done, student can submit for review
      'resubmit_review',    // student submitted for teacher review
      'resubmit_accepted',  // teacher accepted
      'resubmit_rejected',  // teacher rejected
    ),
    defaultValue: 'pending',
  },
  structureResult:    { type: DataTypes.JSON },
  teacherComment:     { type: DataTypes.TEXT },   // teacher accept/reject comment
});
