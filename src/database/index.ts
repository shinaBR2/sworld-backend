import Sequelize, { DataTypes } from 'sequelize';
import { envConfig } from 'src/utils/envConfig';

const databaseUrl = envConfig.databaseUrl;

// @ts-ignore
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
});

const User = sequelize.define(
  'users',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
    },
    auth0Id: {
      type: DataTypes.STRING,
    },
  },
  {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

const Video = sequelize.define(
  'videos',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    videoUrl: {
      type: DataTypes.STRING,
    },
    source: {
      type: DataTypes.STRING,
    },
    thumbnail_url: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.STRING,
    },
  },
  {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

const initialize = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};

const listUsers = async () => {
  return await User.findAll();
};

const finalizeVideo = async (props: any) => {
  const { id, source, thumbnailUrl } = props;

  return await Video.update(
    { source, status: 'ready', thumbnail_url: thumbnailUrl },
    {
      where: {
        id,
      },
    }
  );
};

export { initialize, listUsers, finalizeVideo };
