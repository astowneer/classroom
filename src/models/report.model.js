const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Report', {
  submissionId:    { type: DataTypes.INTEGER, unique: true },
  plagiarismScore: { type: DataTypes.FLOAT },
  structurePassed: { type: DataTypes.BOOLEAN },
  details:         { type: DataTypes.JSON },
  pdfPath:         { type: DataTypes.STRING },
  sentToStudent:   { type: DataTypes.BOOLEAN, defaultValue: false },
});
