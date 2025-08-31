import { validateMediaURL } from 'src/services/videos/convert/validator';
import { z } from 'zod';

const videoUrlSchema = z
  .string()
  .url()
  .regex(/^https:\/\//i, 'URL must use HTTPS')
  .refine(
    (url) => {
      const result = validateMediaURL(url);
      return result.platform !== null || result.fileType !== null;
    },
    {
      message: 'URL must be a valid media file or from a supported platform',
    },
  );

export { videoUrlSchema };
