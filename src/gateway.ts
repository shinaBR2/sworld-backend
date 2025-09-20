import 'dotenv/config';
import './utils/instrument';

import { serve } from '@hono/node-server';
import { sentry } from '@hono/sentry';
import * as Sentry from '@sentry/node';
import rateLimit from 'express-rate-limit';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { app } from './apps/gateway';
import { envConfig } from './utils/envConfig';
import { createHonoLoggingMiddleware, logger } from './utils/logger';

const port = envConfig.port || 4000;

const app = new Hono();
app.use('*', requestId());
app.use(
  '*',
  createHonoLoggingMiddleware({
    nodeEnv: envConfig.nodeEnv,
  }),
);
app.use(
  '*',
  bodyLimit({
    maxSize: envConfig.server.maxBodyLimitInKBNumber * 1024,
    onError: (c) => {
      return c.json(
        {
          error: 'Request body too large',
        },
        413,
      );
    },
  }),
);
app.use(
  '*',
  sentry({
    dsn: envConfig.sentrydsn,
  }),
);

Sentry.setupExpressErrorHandler(app);

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
});

app.use(limiter);

const server = app.listen(port, () => {
  logger.info(`Gateway is running on port ${port}`);
});

const onCloseSignal = () => {
  server.close(() => {
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
