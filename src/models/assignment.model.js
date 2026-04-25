const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Assignment', {
  googleAssignmentId:    { type: DataTypes.STRING, unique: true },
  title:                 { type: DataTypes.STRING, allowNull: false },
  courseId:              { type: DataTypes.INTEGER },
  // Array of required section names e.g. ["Вступ", "Висновок"]
  structureRequirements: { type: DataTypes.JSON, defaultValue: [] },
});
