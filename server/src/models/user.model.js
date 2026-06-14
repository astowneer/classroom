const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('User', {
  googleId:     { type: DataTypes.STRING, unique: true },
  email:        { type: DataTypes.STRING, allowNull: false, unique: true },
  name:         { type: DataTypes.STRING },
  variant:      { type: DataTypes.STRING },
  role:         { type: DataTypes.ENUM('teacher', 'student'), defaultValue: 'student' },
  accessToken:  { type: DataTypes.TEXT },
  refreshToken: { type: DataTypes.TEXT },
});
