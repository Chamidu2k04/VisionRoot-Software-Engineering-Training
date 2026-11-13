import { NextFunction, Request, Response } from 'express';
import {
  createRequestSchema,
  listRequestsQuerySchema,
  requestIdParamSchema,
  updateStatusSchema,
} from './schema';
import { RequestService } from './service';

export class RequestController {
  constructor(private readonly service: RequestService) {}

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createRequestSchema.parse(req.body);
      const created = await this.service.createRequest(validated);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  };

  list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = listRequestsQuerySchema.parse(req.query);
      const requests = await this.service.listRequests(validated.status);
      res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = requestIdParamSchema.parse(req.params);
      const request = await this.service.getRequestById(validated.id);
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = requestIdParamSchema.parse(req.params);
      const { status } = updateStatusSchema.parse(req.body);
      const updated = await this.service.updateRequestStatus(id, status);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };
}
