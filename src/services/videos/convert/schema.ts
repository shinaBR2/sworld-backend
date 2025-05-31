import { z } from 'zod';
import { validateMediaURL } from './validator';
import { EventMetadataSchema, videoUrlSchema } from 'src/schema/videos/common';

const VideoDataSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  video_url: videoUrlSchema,
  skip_process: z.boolean(),
  keep_original_source: z.boolean(),
});

const EventSchema = z.object({
  metadata: EventMetadataSchema,
  data: VideoDataSchema,
});

const transformEvent = (event: z.infer<typeof EventSchema>) => {
  const mediaInfo = validateMediaURL(event.data.video_url);
  const { platform = null, fileType = null } = mediaInfo;

  return {
    data: {
      id: event.data.id,
      userId: event.data.user_id,
      videoUrl: event.data.video_url,
      skipProcess: event.data.skip_process,
      keepOriginalSource: event.data.keep_original_source,
      platform,
      fileType,
    },
    metadata: {
      id: event.metadata.id,
      spanId: event.metadata.span_id,
      traceId: event.metadata.trace_id,
    },
  };
};

const ConvertSchema = z
  .object({
    body: z.object({
      event: EventSchema,
    }),
    headers: z
      .object({
        'content-type': z.string(),
        'x-webhook-signature': z.string(),
      })
      .passthrough(),
  })
  .transform(req => ({
    event: transformEvent(req.body.event),
    contentTypeHeader: req.headers['content-type'] as string,
    signatureHeader: req.headers['x-webhook-signature'] as string,
  }));

export { ConvertSchema, EventSchema, VideoDataSchema };
export type ConvertRequest = z.infer<typeof ConvertSchema>;
