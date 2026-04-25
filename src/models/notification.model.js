const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Notification', {
  userId:       { type: DataTypes.INTEGER, allowNull: false },
  submissionId: { type: DataTypes.INTEGER },
  message:      { type: DataTypes.TEXT, allowNull: false },
  read:         { type: DataTypes.BOOLEAN, defaultValue: false },
});
