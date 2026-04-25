const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('PlagiarismResult', {
  sourceSubmissionId: { type: DataTypes.INTEGER },  // оригінальна (рання) робота
  targetSubmissionId: { type: DataTypes.INTEGER },  // робота де знайдено запозичення
  similarity:         { type: DataTypes.FLOAT },    // % схожості
  matches:            { type: DataTypes.JSON },     // [{ text, sourceOffset, targetOffset }]
});
