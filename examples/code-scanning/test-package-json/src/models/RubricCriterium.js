const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'RubricCriterium',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      rubric_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'RubricId',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'rubric_criteria',
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
