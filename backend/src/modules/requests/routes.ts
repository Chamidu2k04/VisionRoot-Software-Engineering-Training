import { Router, Request, Response } from 'express';
import { InMemoryRequestRepository, IRequestRepository } from './repository';
import { RequestService } from './service';
import { RequestController } from './controller';

export function createRequestsRouter(
  repo: IRequestRepository = new InMemoryRequestRepository()
): Router {
  const router = Router();
  const service = new RequestService(repo);
  const controller = new RequestController(service);

  // Health endpoint
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'service-request-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Service Request endpoints
  router.post('/requests', controller.create);
  router.get('/requests', controller.list);
  router.get('/requests/:id', controller.getById);
  router.patch('/requests/:id/status', controller.updateStatus);

  return router;
}

export const requestsRouter = createRequestsRouter();
