import { PlaywrightRequestHandler } from 'crawlee';
import { CustomError } from 'src/utils/custom-error';
import { CRAWL_ERRORS, HTTP_ERRORS } from 'src/utils/error-codes';
import { logger } from 'src/utils/logger';
import { HandlerOptions, HandlerState, RequestHandlerWithState, SelectorName } from '../types';
import { scrapeUrl } from './scrapers';
import { videoUrlXHRMatcher } from './utils';

/**
 * Creates a request handler for Halim movie sites
 * @param options Configuration options for the handler
 * @returns Object containing the handler function and its initial state
 */
const hh3dHandler = <T>(options: HandlerOptions): RequestHandlerWithState<T> => {
  const { selectors, getSingleVideo } = options;

  // Initialize state that will be shared across all handler calls
  const initialState: HandlerState<T> = {
    data: [],
    processedUrls: [],
  };

  /**
   * For now url is ALL what we need
   */
  const urlSelector = selectors.find(selector => selector.name === SelectorName.URL);

  if (!urlSelector) {
    throw CustomError.high('Missing url selector', {
      shouldRetry: false,
      errorCode: CRAWL_ERRORS.MISSING_URL_SELECTOR,
      context: {
        selectors,
      },
      source: 'services/crawler/hh3d/index.ts',
    });
  }

  const { selector, waitForSelectorTimeout: timeout } = urlSelector;

  // Create the request handler
  const handler: PlaywrightRequestHandler = async ({ page, request, enqueueLinks }) => {
    const currentPageUrl = request.url;
    let videoUrl: string | null = null;

    const videoUrlPromise = new Promise<string | null>(resolve => {
      page.route('**/*', async route => {
        const req = route.request();

        if (videoUrlXHRMatcher(req.url())) {
          let response;
          try {
            response = await route.fetch();
          } catch (error) {
            throw CustomError.high('Request failed', {
              originalError: error,
              shouldRetry: true,
              errorCode: HTTP_ERRORS.NETWORK_ERROR,
              context: {
                selectors,
              },
              source: 'services/crawler/hh3d/index.ts',
            });
          }

          videoUrl = await scrapeUrl(response);
          resolve(videoUrl);
        }

        await route.continue();
      });
    });

    logger.info(`Processing ${request.url}...`);
    await page.goto(currentPageUrl);

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), timeout));

    await Promise.race([videoUrlPromise, timeoutPromise]);

    // Add data to the shared state
    initialState.data.push({
      url: currentPageUrl,
      videoUrl: videoUrl,
    } as unknown as T);

    initialState.processedUrls.push(currentPageUrl);

    if (getSingleVideo) {
      return;
    }

    // Wait for selector and enqueue links only if selector is provided
    try {
      await page.waitForSelector(selector, { timeout });
      await enqueueLinks({ selector });
    } catch (error) {
      throw CustomError.high('Enqueue links failed', {
        originalError: error,
        shouldRetry: false,
        errorCode: HTTP_ERRORS.NETWORK_ERROR,
        context: {
          selectors,
        },
        source: 'services/crawler/hh3d/index.ts',
      });
    }
  };

  return { handler, initialState };
};

export { hh3dHandler };
