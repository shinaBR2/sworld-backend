import { v2 as cloudinary } from "cloudinary";
import { envConfig } from "src/utils/envConfig";

cloudinary.config({
  cloud_name: envConfig.cloudinaryName,
  api_key: envConfig.cloudinaryApiKey,
  api_secret: envConfig.cloudinaryApiSecret,
});

const uploadFromLocalFilePath = async (localFilePath: string, options = {}) => {
  const uploadResult = await cloudinary.uploader
    .upload(localFilePath, {
      ...options,
    })
    .catch((error) => {
      console.log(error);
    });

  console.log(uploadResult);

  if (uploadResult) {
    return uploadResult.url;
  }

  return "";
};

export { uploadFromLocalFilePath };
