const { DataTypes } = require('sequelize');

/**
 * Define db model
 *
 * @param sequelize - Sequelize
 * @returns Definition
 */
module.exports = function (sequelize) {
  return sequelize.define(
    'Participant',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        comment:
          'This should be the id of the user (a participant is a type of user) however I have included a separate UserId just in case we need it for Sequelize',
      },
      is_undergrad: {
        type: DataTypes.TINYINT,
        allowNull: false,
      },
      major: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      campus: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      course_code: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      viu_advisor: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'UserId',
      },
      group_member_1_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment:
          'The group_member fields were added to store the names of group members - these will be null if it is an individual project',
        field: 'group_member1_name',
      },
      group_member_2_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'group_member2_name',
      },
      group_member_3_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'group_member3_name',
      },
      group_member_4_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'group_member4_name',
      },
    },
    {
      sequelize,
      tableName: 'participant',
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
