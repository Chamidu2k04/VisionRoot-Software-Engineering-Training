import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/environment';
import { requestsRouter } from './modules/requests/routes';
import { errorHandler } from './middleware/error-handler';

export function createApp(): Express {
  const app = express();

  // 1. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: env.corsOrigin === '*' ? '*' : env.corsOrigin,
      credentials: true,
    })
  );

  // 2. Body Parser (JSON payload parsing)
  app.use(express.json());

  // 3. Lightweight Request Logger Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
      );
    });
    next();
  });

  // 4. Root Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'service-request-api',
      timestamp: new Date().toISOString(),
    });
  });

  // 5. API Routes
  app.use('/api', requestsRouter);

  // 6. 404 Catch-All Route Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        details: [],
      },
    });
  });

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
