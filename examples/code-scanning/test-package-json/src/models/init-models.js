const { DataTypes } = require('sequelize');
const _Comment = require('./Comment');
const _Event = require('./Event');
const _Mark = require('./Mark');
const _Participant = require('./Participant');
const _Project = require('./Project');
const _ProjectType = require('./ProjectType');
const _Role = require('./Role');
const _Rubric = require('./Rubric');
const _Schedule = require('./Schedule');
const _User = require('./User');
const _Vote = require('./Vote');

/**
 *
 * @param sequelize
 */
function initModels(sequelize) {
  const Comment = _Comment(sequelize);
  const Event = _Event(sequelize);
  const Mark = _Mark(sequelize);
  const Participant = _Participant(sequelize);
  const Project = _Project(sequelize);
  const ProjectType = _ProjectType(sequelize);
  const Role = _Role(sequelize);
  const Rubric = _Rubric(sequelize);
  const Schedule = _Schedule(sequelize);
  const User = _User(sequelize);
  const Vote = _Vote(sequelize);

  Schedule.belongsTo(Event, { as: 'event', foreignKey: 'event_id' });
  Event.hasMany(Schedule, { as: 'schedules', foreignKey: 'event_id' });
  Schedule.belongsTo(Project, { as: 'project', foreignKey: 'project_id' });
  Project.hasMany(Schedule, { as: 'schedules', foreignKey: 'project_id' });

  return {
    Comment,
    Event,
    Mark,
    Participant,
    Project,
    ProjectType,
    Role,
    Rubric,
    Schedule,
    User,
    Vote,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
