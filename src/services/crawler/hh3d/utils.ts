import { Page } from 'playwright';
import { simpleScraper } from '../utils';
import { SelectorConfig } from '../types';
import { videoUrlXHRUrl } from './selectors';

const scrapeMapping = async (page: Page, selector: SelectorConfig) => {
  if (selector.name == 'url') {
    return await simpleScraper(page, selector);
  }

  return await simpleScraper(page, selector);
};

const videoUrlXHRMatcher = (url: string) => {
  return url.includes(videoUrlXHRUrl);
};

export { scrapeMapping, videoUrlXHRMatcher };
