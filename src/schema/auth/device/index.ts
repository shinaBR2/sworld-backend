import { z } from 'zod';

const deviceRequestCreateSchema = z.object({
  body: z.object({
    action: z.object({
      name: z.string(),
    }),
    input: z.object({
      input: z.object({
        extensionId: z.string(),
      }),
    }),
  }),
  headers: z
    .object({
      'content-type': z.string(),
      'X-Hasura-Action': z.string(),
    })
    .passthrough(),
});

export type DeviceRequestCreateRequest = z.infer<typeof deviceRequestCreateSchema>;
export { deviceRequestCreateSchema };
