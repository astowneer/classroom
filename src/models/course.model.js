const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Course', {
  googleCourseId: { type: DataTypes.STRING, unique: true },
  name:           { type: DataTypes.STRING, allowNull: false },
  teacherId:      { type: DataTypes.INTEGER },
});
