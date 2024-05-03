const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'Rubric',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      project_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'ProjectTypeId',
      },
    },
    {
      sequelize,
      tableName: 'rubric',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
      ],
    },
  );
};
