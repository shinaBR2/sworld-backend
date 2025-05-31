import { EventMetadataSchema } from 'src/schema/hasura';
import { taskHandlerHeaderSchema } from 'src/utils/cloud-task/schema';
import { z } from 'zod';
import { videoDataSchema } from '../convert';

const streamHandlerSchema = z.object({
  body: z.object({
    data: z.object({
      id: videoDataSchema.shape.id,
      userId: videoDataSchema.shape.user_id,
      videoUrl: videoDataSchema.shape.video_url,
      keepOriginalSource: videoDataSchema.shape.keep_original_source,
    }),
    metadata: z.object({
      id: EventMetadataSchema.shape.id,
      spanId: EventMetadataSchema.shape.span_id,
      traceId: EventMetadataSchema.shape.trace_id,
    }),
  }),
  headers: taskHandlerHeaderSchema.passthrough(),
});

export type StreamHandlerRequest = z.infer<typeof streamHandlerSchema>;
export { streamHandlerSchema };
