import { PlaywrightRequestHandler } from 'crawlee';
import { HandlerOptions, HandlerState, RequestHandlerWithState } from '../types';

/**
 * Creates a request handler for Halim movie sites
 * @param options Configuration options for the handler
 * @returns Object containing the handler function and its initial state
 */
const hh3dHandler = <T>(options: HandlerOptions): RequestHandlerWithState<T> => {
  const { selector, waitForSelectorTimeout = 30000 } = options;

  // Initialize state that will be shared across all handler calls
  const initialState: HandlerState<T> = {
    data: [],
    processedUrls: [],
  };

  // Create the request handler
  const handler: PlaywrightRequestHandler = async ({ page, request, enqueueLinks }) => {
    const currentPageUrl = request.url;
    let videoUrl: string | null = null;
    const targetUrl = 'wp-content/themes/halimmovies/player.php';

    const videoUrlPromise = new Promise<string | null>(resolve => {
      page.route('**/*', async route => {
        const req = route.request();

        if (req.url().includes(targetUrl)) {
          try {
            const response = await route.fetch();
            const responseText = await response.text();

            try {
              const data = JSON.parse(responseText);
              if (data && data.file) {
                videoUrl = data.file;
                resolve(data.file);
              }
            } catch (parseError) {
              console.error('Error parsing JSON response:', parseError);
            }
          } catch (error) {
            console.error('Error intercepting request', error);
          }
        }

        await route.continue();
      });
    });

    // console.log(`Processing ${request.url}...`);
    await page.goto(currentPageUrl);

    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), waitForSelectorTimeout));

    await Promise.race([videoUrlPromise, timeoutPromise]);

    // Add data to the shared state
    initialState.data.push({
      url: currentPageUrl,
      videoUrl: videoUrl,
    } as unknown as T);

    initialState.processedUrls.push(currentPageUrl);

    // Wait for selector and enqueue links only if selector is provided
    if (selector) {
      try {
        await page.waitForSelector(selector, { timeout: waitForSelectorTimeout });
        await enqueueLinks({ selector });
      } catch (error) {
        console.log(`No elements found for selector: ${selector}`);
      }
    }
  };

  return { handler, initialState };
};

export { hh3dHandler };
