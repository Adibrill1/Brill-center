import express from 'express';
import { languageMiddleware } from './i18n/index.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { spacesRouter } from './routes/spaces.js';
import { bookingsRouter } from './routes/bookings.js';
import { inventoryRouter } from './routes/inventory.js';
import { ideasRouter } from './routes/ideas.js';
import { treasuryRouter } from './routes/treasury.js';
import { translationsRouter } from './routes/translations.js';
import { webhooksRouter } from './routes/webhooks.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Raw JSON body, kept for webhook HMAC verification. */
      rawBody?: string;
    }
  }
}

export function createApp(): express.Express {
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(languageMiddleware);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'brill-center-backend' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/spaces', spacesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/treasury', treasuryRouter);
  app.use('/api/translations', translationsRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
