import { RequestHandler } from 'crawlee';

interface HandlerOptions {
  selector?: string;
  waitForSelectorTimeout?: number;
}

interface HandlerState<T> {
  data: T[];
  processedUrls: string[];
}

interface RequestHandlerWithState<T> {
  handler: RequestHandler;
  initialState: HandlerState<T>;
}

export type { HandlerOptions, HandlerState, RequestHandlerWithState };
