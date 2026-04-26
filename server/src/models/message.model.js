const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Message', {
  submissionId: { type: DataTypes.INTEGER, allowNull: false },
  senderId:     { type: DataTypes.INTEGER, allowNull: false },
  text:         { type: DataTypes.TEXT, allowNull: false },
  read:         { type: DataTypes.BOOLEAN, defaultValue: false },
});
