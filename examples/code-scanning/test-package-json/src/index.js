// croftd - starter project for Sequelize ORM
// Updated Nov. 26, 2023
// query examples adapted from:
// https://www.digitalocean.com/community/tutorials/how-to-use-sequelize-with-node-js-and-mysql

// this is the ORM package
const SequelizeMock = require('sequelize-mock');

const sequelize = new SequelizeMock();

// load our models that were auto-generated
const initModels = require('./models/init-models.js');

const models = initModels(sequelize);

// UserProject
models.User.belongsToMany(models.Project, { through: 'user_project' });
models.Project.belongsToMany(models.User, { through: 'user_project' });
// EventProject
models.Event.belongsToMany(models.Project, { through: 'event_project' });
models.Project.belongsToMany(models.Event, { through: 'event_project' });
// UserRole
models.User.belongsToMany(models.Role, { through: 'user_role' });
models.Role.belongsToMany(models.User, { through: 'user_role' });

console.log(models);
