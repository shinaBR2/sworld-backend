import { hh3dHandler } from './hh3d';
import { HandlerOptions, RequestHandlerWithState } from './types';

/**
 * Determines the appropriate handler based on the start URLs
 */
const getHandlerType = (startUrls: string[]): string => {
  // Logic to determine which handler to use based on URL patterns
  if (startUrls.some(url => url.includes('hoathinh3d'))) {
    return 'hh3d';
  }

  // Default handler
  return '';
};

/**
 * Creates and returns the appropriate request handler based on the handler type
 * @param handlerType Type of handler to create
 * @param options Options to pass to the handler
 * @returns Object containing the handler function and its initial state
 */
const createRequestHandler = <T>(handlerType: string, options: HandlerOptions): RequestHandlerWithState<T> => {
  switch (handlerType) {
    case 'hh3d': {
      return hh3dHandler<T>(options);
    }
    default: {
      throw new Error(`Unsupported handler type: ${handlerType}`);
    }
  }
};

export { getHandlerType, createRequestHandler };
