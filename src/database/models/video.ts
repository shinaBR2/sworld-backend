import { DataTypes } from 'sequelize';
import { sequelize } from '../index';

interface VideoTS {
  id: string;
}

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
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export { Video, type VideoTS };
