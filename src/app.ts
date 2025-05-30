import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { errors as celebrateErrors } from 'celebrate';
import { identifyRouter } from './routes/identify.js';
import { registry } from './metrics.js';

export const createApp = () => {
  const app = express();
  app.use(express.json());

  // basic rate-limit
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
    }),
  );

  // Prometheus metrics
  app.get('/metrics', async (_req: Request, res: Response) => {
    res.set('content-type', registry.contentType);
    res.end(await registry.metrics());
  });

  app.use('/identify', identifyRouter);

  // celebrate validation errors
  app.use(celebrateErrors());

  // generic 500 handler (typed params!)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error';
    res.status(500).json({ error: { message } });
  });

  return app;
};
