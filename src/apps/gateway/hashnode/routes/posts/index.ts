import { Request, Response } from 'express';
import { deletePost } from 'src/services/hasura/mutations/posts/delete';
import { insertPost } from 'src/services/hasura/mutations/posts/insert';
import { updatePost } from 'src/services/hasura/mutations/posts/update';
import { CustomError } from 'src/utils/custom-error';
import { envConfig } from 'src/utils/envConfig';
import { HTTP_ERRORS, VALIDATION_ERRORS } from 'src/utils/error-codes';
import { logger } from 'src/utils/logger';
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

  // Send request to hashnode API to get post

  try {
    if (eventType === 'post_published') {
      await insertPost({
        hId: postId,
        ...post,
      });
    } else if (eventType === 'post_updated') {
      await updatePost(postId, post);
    } else if (eventType === 'post_deleted') {
      await deletePost(postId);
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
  } catch (error) {
    logger.info(error, 'error');
    throw CustomError.high('Failed to process post event', {
      shouldRetry: true,
      errorCode: HTTP_ERRORS.SERVER_ERROR,
      context: {
        error,
        body,
      },
      source: 'apps/gateway/hashnode/routes/posts/index.ts',
    });
  }
};

export { postEventsHandler };
