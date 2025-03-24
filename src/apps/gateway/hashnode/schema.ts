import { z } from 'zod';

const headersSchema = z.object({
  'content-type': z.literal('application/json'),
  'x-hashnode-signature': z.string(),
});
const schema = {
  headers: headersSchema.passthrough(),
};
const transformHeaders = (req: any) => ({
  contentTypeHeader: req.headers['content-type'] as string,
  signatureHeader: req.headers['x-hashnode-signature'] as string,
});

const webhookSchema = z.object(schema).transform(transformHeaders);

export type WebhookRequest = z.infer<typeof webhookSchema>;
export { webhookSchema };
