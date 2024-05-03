const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'Mark',
    {
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      criteria_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        field: 'CriteriaId',
      },
      project_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        field: 'ProjectId',
      },
    },
    {
      sequelize,
      tableName: 'mark',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'CriteriaId' }, { name: 'ProjectId' }],
        },
      ],
    },
  );
};
