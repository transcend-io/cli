const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'Event',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      is_virtual: {
        type: DataTypes.TINYINT,
        allowNull: true,
        comment: 'Determines if this event is virtual',
      },
      event_description: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      event_location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment:
          'Location of the event - e.g. Upper Cafeteria, Theatre, Twitter',
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment:
          'determines how many participants can present at this event (e.g. the cafeteria has space for 50 poster presentation)',
      },
    },
    {
      sequelize,
      tableName: 'event',
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
