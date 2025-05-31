import { z } from 'zod';
import { taskHandlerHeaderSchema } from 'src/utils/cloud-task/schema';
import { videoDataSchema } from 'src/schema/videos/convert';

const FixDurationHandlerSchema = z.object({
  body: z.object({
    id: videoDataSchema.shape.id,
  }),
  headers: taskHandlerHeaderSchema.passthrough(),
});

export type FixDurationHandlerRequest = z.infer<typeof FixDurationHandlerSchema>;
export { FixDurationHandlerSchema };
