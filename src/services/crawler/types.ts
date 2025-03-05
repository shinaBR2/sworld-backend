import { PlaywrightRequestHandler, RequestHandler } from 'crawlee';

interface HandlerOptions {
  selector?: string;
  waitForSelectorTimeout?: number;
}

interface HandlerState<T> {
  data: T[];
  processedUrls: string[];
}

interface RequestHandlerWithState<T> {
  handler: PlaywrightRequestHandler;
  initialState: HandlerState<T>;
}

export type { HandlerOptions, HandlerState, RequestHandlerWithState };
