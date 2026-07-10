// src/utils/request-handler.ts
import type { Context } from 'hono';
import type { ServiceResponse } from './schema';

interface HandlerContext<T = any> {
  validatedData: T;
}

// Shared shape: a pure business-logic function taking validated input and
// resolving some response R.
type Handler<T = any, R = any> = (context: HandlerContext<T>) => Promise<R>;

// A handler returning the generic ServiceResponse envelope
type BusinessHandler<T = any, R = any> = Handler<T, ServiceResponse<R>>;

// Shared runtime: pull validatedData off context, run the handler, serialize
// its result. Both wrappers below differ only in the TS constraint on R.
const wrapHandler = <T, R>(
  handler: (context: HandlerContext<T>) => Promise<R>,
) => {
  return async (c: Context) => {
    const context: HandlerContext<T> = {
      validatedData: c.get('validatedData'),
    };

    const result = await handler(context);
    return c.json(result);
  };
};

// Hono wrapper
const honoRequestHandler = <T = any, R = any>(handler: BusinessHandler<T, R>) =>
  wrapHandler(handler);

// For a handler backing a Hasura Action with its own declared response
// contract (e.g. { success, data, error }) instead of the generic
// ServiceResponse envelope ({ success, message, dataObject }) — Handler<T, R>
// already carries no constraint beyond that, so no separate alias is needed.
const honoActionHandler = <T = any, R = any>(handler: Handler<T, R>) =>
  wrapHandler(handler);

export {
  honoRequestHandler,
  honoActionHandler,
  type BusinessHandler,
  type Handler,
  type HandlerContext,
};
