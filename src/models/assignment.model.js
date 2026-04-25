const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Assignment', {
  googleAssignmentId:    { type: DataTypes.STRING, unique: true },
  title:                 { type: DataTypes.STRING, allowNull: false },
  description:           { type: DataTypes.TEXT },   // short human-readable description
  referenceText:         { type: DataTypes.TEXT },   // full etalon text for AI completeness check
  courseId:              { type: DataTypes.INTEGER },
  structureRequirements: { type: DataTypes.JSON, defaultValue: [] },
  minTextLength:         { type: DataTypes.INTEGER, defaultValue: 100 },
});
