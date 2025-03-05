import { PlaywrightRequestHandler, RequestHandler } from 'crawlee';

interface SelectorConfig {
  selector: string;
  name: string;
  waitForSelectorTimeout?: number;
  required: boolean;
}

interface HandlerOptions {
  selectors: SelectorConfig[];
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

export type { SelectorConfig, HandlerOptions, HandlerState, RequestHandlerWithState };
