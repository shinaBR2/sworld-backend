import { PlaywrightCrawler, PlaywrightCrawlerOptions, PlaywrightRequestHandler } from 'crawlee';
import { createRequestHandler, getHandlerType } from './utils';
import { crawlConfig } from 'src/utils/systemConfig';

interface BaseCrawlOptions extends Omit<PlaywrightCrawlerOptions, 'requestHandler'> {
  selector?: string;
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
  const { waitForSelectorTimeout = crawlConfig.defaultWaitForSelectorTimeout, selector, ...crawlerOptions } = options;

  // Create request handler specific to the determined type
  const { handler, initialState } = createRequestHandler<T>(handlerType, {
    selector,
    waitForSelectorTimeout,
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
