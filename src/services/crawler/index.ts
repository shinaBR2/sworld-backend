import { PlaywrightCrawler, PlaywrightCrawlerOptions, PlaywrightRequestHandler } from 'crawlee';
import { createRequestHandler, getHandlerType } from './utils';
import { crawlConfig } from 'src/utils/systemConfig';
import { SelectorConfig } from './types';

interface BaseCrawlOptions extends Omit<PlaywrightCrawlerOptions, 'requestHandler'> {
  selectors?: SelectorConfig[];
  waitForSelectorTimeout?: number;
  handlerType?: string;
}

interface CrawlResult<T> {
  data: T[];
  urls: string[];
}

/**
 * Generic crawler function that selects the appropriate handler based on input URLs
 * @param startUrls Array of URLs to start crawling from
 * @param options Configuration options for the crawler
 * @returns Promise resolving to a CrawlResult object with the collected data
 */
const crawl = async <T>(startUrls: string[], options: BaseCrawlOptions): Promise<CrawlResult<T>> => {
  // If handlerType is not specified, determine it based on startUrls
  const handlerType = options.handlerType || getHandlerType(startUrls);
  const { defaultWaitForSelectorTimeout } = crawlConfig;
  const { selectors = [], ...crawlerOptions } = options;

  if (!handlerType || !selectors.length) {
    // TODO use CustomError?
    throw new Error('Invalid handler type or selectors provided');
  }

  // Process selectors to ensure they all have a timeout value
  const processedSelectors = selectors.map(selector => ({
    ...selector,
    waitForSelectorTimeout: selector.waitForSelectorTimeout || defaultWaitForSelectorTimeout,
  }));

  // Create request handler specific to the determined type
  const { handler, initialState } = createRequestHandler<T>(handlerType, {
    selectors: processedSelectors,
  });

  const crawler = new PlaywrightCrawler({
    ...crawlerOptions,
    requestHandler: handler as unknown as PlaywrightRequestHandler,
  });

  await crawler.run(startUrls);

  return {
    data: initialState.data,
    urls: initialState.processedUrls,
  };
};

export { crawl };
