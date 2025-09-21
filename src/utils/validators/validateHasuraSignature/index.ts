import type { Context, Next } from 'hono';
import { CustomError } from 'src/utils/custom-error';
import { VALIDATION_ERRORS } from 'src/utils/error-codes';
import { getCurrentLogger } from 'src/utils/logger';
import { AppError } from 'src/utils/schema';
import { validateSignature } from './validator';

export const validateHasuraSignature = () => {
  return async (c: Context, next: Next) => {
    const logger = getCurrentLogger();
    try {
      const signatureHeader = c.req.header('x-webhook-signature');
      const body = await c.req.json();

      if (!signatureHeader) {
        throw CustomError.high('Missing signature header', {
          shouldRetry: false,
          errorCode: VALIDATION_ERRORS.INVALID_SIGNATURE,
        });
      }

      const valid = validateSignature(signatureHeader);

      if (!valid) {
        logger.info({
          message: 'Invalid Hasura webhook signature',
          eventId: body.event.metadata.id,
        });
        return c.json(
          AppError('Invalid webhook signature', {
            eventId: body.event.metadata.id,
          }),
        );
      }

      await next();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw CustomError.high('Invalid request', {
        shouldRetry: false,
        errorCode: VALIDATION_ERRORS.INVALID_SIGNATURE,
        originalError: error as Error,
      });
    }
  };
};
