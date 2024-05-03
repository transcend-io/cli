const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'Project',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      theme: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      course_name: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'project',
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
