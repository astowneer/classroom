const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Report', {
  submissionId:    { type: DataTypes.INTEGER, unique: true },
  plagiarismScore: { type: DataTypes.FLOAT },
  structurePassed: { type: DataTypes.BOOLEAN },
  details:         { type: DataTypes.JSON },
  grade:           { type: DataTypes.JSON },
  extractedFields: { type: DataTypes.JSON }, // { "Варіант": "7", "Виконав": "Іваненко І.І." }  // { total, maxTotal, breakdown }
  pdfPath:         { type: DataTypes.STRING },
  sentToStudent:   { type: DataTypes.BOOLEAN, defaultValue: false },
});
