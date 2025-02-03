import Sequelize, { DataTypes } from 'sequelize';
import { envConfig } from 'src/utils/envConfig';

const databaseUrl = envConfig.databaseUrl;

// @ts-ignore
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
});

const initialize = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};

export { sequelize, initialize };
