import { CustomError } from '../custom-error';
import { HTTP_ERRORS } from '../error-codes';

interface FetchWrapperOptions extends RequestInit {
  timeout?: number;
}

const fetchWithError = async (url: string, options?: FetchWrapperOptions): Promise<Response> => {
  const context = {
    url,
  };

  try {
    const response = await fetch(url, options);

    if (response.status >= 500) {
      throw new CustomError(`Server error: ${response.statusText}`, {
        errorCode: HTTP_ERRORS.SERVER_ERROR,
        shouldRetry: true,
        context,
      });
    }

    if (!response.ok) {
      throw new CustomError(`Client error: ${response.statusText}`, {
        errorCode: HTTP_ERRORS.CLIENT_ERROR,
        shouldRetry: false,
        context,
      });
    }

    return response;
  } catch (error) {
    /**
     * if we already formatted this error properly earlier,
     * let it pass through;
     * otherwise, treat it as a network error and format it accordingly.
     */
    if (error instanceof CustomError) {
      throw error;
    }

    // Network errors (TypeError) are always retryable
    throw new CustomError('Network error while fetching', {
      originalError: error as Error,
      errorCode: HTTP_ERRORS.NETWORK_ERROR,
      shouldRetry: true,
      context: {
        ...context,
      },
    });
  }
};

export { fetchWithError, type FetchWrapperOptions };
