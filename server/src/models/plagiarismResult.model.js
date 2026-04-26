const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('PlagiarismResult', {
  sourceSubmissionId: { type: DataTypes.INTEGER },
  targetSubmissionId: { type: DataTypes.INTEGER },
  similarity:         { type: DataTypes.FLOAT },
  matches:            { type: DataTypes.JSON },
}, {
  indexes: [
    { unique: true, fields: ['sourceSubmissionId', 'targetSubmissionId'] },
  ],
});
