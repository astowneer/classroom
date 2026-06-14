const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Assignment', {
  googleAssignmentId:    { type: DataTypes.STRING, unique: true },
  title:                 { type: DataTypes.STRING, allowNull: false },
  description:           { type: DataTypes.TEXT },  
  referenceText:         { type: DataTypes.TEXT },  
  courseId:              { type: DataTypes.INTEGER },
  structureRequirements: { type: DataTypes.JSON, defaultValue: [] },
  minTextLength:         { type: DataTypes.INTEGER, defaultValue: 100 },
  gradingConfig:         { type: DataTypes.JSON, defaultValue: null },
  stopPhrases:           { type: DataTypes.JSON, defaultValue: [] },
  extractFields:         { type: DataTypes.JSON, defaultValue: [] },
});
