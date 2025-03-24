import { Request, Response } from 'express';
import { CustomError } from 'src/utils/custom-error';
import { envConfig } from 'src/utils/envConfig';
import { VALIDATION_ERRORS } from 'src/utils/error-codes';
import { AppResponse } from 'src/utils/schema';
import { ValidatedRequest } from 'src/utils/validator';
import { WebhookRequest } from '../../schema';
import { validateSignature } from '../../validator';

const postEventsHandler = async (req: Request, res: Response) => {
  const { validatedData } = req as ValidatedRequest<WebhookRequest>;
  const { signatureHeader, body } = validatedData;

  const validationResult = validateSignature({
    incomingSignatureHeader: signatureHeader,
    payload: body,
    secret: envConfig.hashnodeWebhookSecret as string,
  });

  if (!validationResult.isValid) {
    throw CustomError.high('Invalid signature', {
      shouldRetry: false,
      errorCode: VALIDATION_ERRORS.INVALID_SIGNATURE,
      context: {
        reason: validationResult.reason,
        body,
      },
      source: 'apps/gateway/hashnode/routes/posts/index.ts',
    });
  }

  const { eventType, post } = body.data;
  const { id: postId } = post;

  if (eventType === 'post_published') {
    // TODO: trigger the compute service to generate the image
  } else if (eventType === 'post_updated') {
    // TODO: trigger the compute service to delete the image
  } else if (eventType === 'post_deleted') {
    // TODO: trigger the compute service to delete the image
  } else {
    throw CustomError.high('Invalid event type', {
      shouldRetry: false,
      errorCode: VALIDATION_ERRORS.INVALID_PAYLOAD,
      context: {
        body,
      },
      source: 'apps/gateway/hashnode/routes/posts/index.ts',
    });
  }

  return res.json(AppResponse(true, 'ok'));
};

export { postEventsHandler };
