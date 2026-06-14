// src/utils/request-handler.ts
import type { Context } from 'hono';
import { reportVideoTaskFailure } from 'src/middleware/reportVideoFailure';
import type { ServiceResponse } from './schema';

interface HandlerContext<T = any> {
  validatedData: T;
}

// Pure business logic handler type
type BusinessHandler<T = any, R = any> = (
  context: HandlerContext<T>,
) => Promise<ServiceResponse<R>>;

// Hono wrapper
const honoRequestHandler = <T = any, R = any>(
  handler: BusinessHandler<T, R>,
) => {
  return async (c: Context) => {
    const context: HandlerContext<T> = {
      validatedData: c.get('validatedData'),
    };

    try {
      const result = await handler(context);
      return c.json(result);
    } catch (error) {
      // B1: on a terminal failure of a video-processing task, flag the video
      // `failed`. No-op for non-video tasks; never throws. Re-throw so the
      // existing error path still produces the response.
      await reportVideoTaskFailure(error, c);
      throw error;
    }
  };
};

export { honoRequestHandler, type BusinessHandler, type HandlerContext };
