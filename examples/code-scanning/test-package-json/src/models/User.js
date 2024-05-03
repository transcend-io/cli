const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'User',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      first_name: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      email_address: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      is_participant: {
        type: DataTypes.TINYINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'user',
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
