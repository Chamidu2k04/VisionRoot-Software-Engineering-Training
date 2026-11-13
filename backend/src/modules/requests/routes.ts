import { Router, Request, Response } from 'express';
import { PostgresRequestRepository, IRequestRepository } from './repository';
import { RequestService } from './service';
import { RequestController } from './controller';
import { checkDatabaseHealth } from '../../database/connection';

export function createRequestsRouter(
  repo: IRequestRepository = new PostgresRequestRepository()
): Router {
  const router = Router();
  const service = new RequestService(repo);
  const controller = new RequestController(service);

  // Health endpoint with live database connectivity verification
  router.get('/health', async (_req: Request, res: Response) => {
    const isDbConnected = await checkDatabaseHealth();
    if (isDbConnected) {
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Service Request endpoints
  router.post('/requests', controller.create);
  router.get('/requests', controller.list);
  router.get('/requests/:id', controller.getById);
  router.patch('/requests/:id/status', controller.updateStatus);

  return router;
}

export const requestsRouter = createRequestsRouter();
