import { z } from 'zod';
import { taskHandlerHeaderSchema } from 'src/utils/cloud-task/schema';
import { videoDataSchema } from 'src/schema/videos/convert';

const FixThumbnailHandlerSchema = z.object({
  body: z.object({
    id: videoDataSchema.shape.id,
  }),
  headers: taskHandlerHeaderSchema.passthrough(),
});

export type FixThumbnailHandlerRequest = z.infer<typeof FixThumbnailHandlerSchema>;
export { FixThumbnailHandlerSchema };
