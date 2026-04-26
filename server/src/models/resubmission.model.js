const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Resubmission', {
  submissionId:    { type: DataTypes.INTEGER, allowNull: false }, // original submission
  studentId:       { type: DataTypes.INTEGER, allowNull: false },
  localFilePath:   { type: DataTypes.TEXT },
  extractedText:   { type: DataTypes.TEXT },
  structureResult: { type: DataTypes.JSON },
  status: {
    type: DataTypes.ENUM('pending', 'checked', 'review', 'accepted', 'rejected'),
    defaultValue: 'pending',
  },
  teacherComment:  { type: DataTypes.TEXT },
  plagiarismScore: { type: DataTypes.FLOAT },
  reportDetails:   { type: DataTypes.JSON }, // { structureResult, plagiarismMatches, ... }
  grade:           { type: DataTypes.JSON },
});
