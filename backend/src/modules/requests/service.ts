import { NotFoundError, ValidationError } from '../../errors/AppError';
import { IRequestRepository } from './repository';
import {
  ALLOWED_STATUS_TRANSITIONS,
  CreateRequestDTO,
  RequestStatus,
  ServiceRequest,
} from './types';

export class RequestService {
  constructor(private readonly repository: IRequestRepository) {}

  async createRequest(dto: CreateRequestDTO): Promise<ServiceRequest> {
    // Domain rule: Every newly created service request must initialize in 'OPEN' status
    const initialStatus: RequestStatus = 'OPEN';

    return this.repository.create({
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: dto.priority,
      status: initialStatus,
    });
  }

  async listRequests(status?: RequestStatus): Promise<ServiceRequest[]> {
    return this.repository.findAll(status);
  }

  async getRequestById(id: string): Promise<ServiceRequest> {
    const request = await this.repository.findById(id);
    if (!request) {
      throw new NotFoundError(
        `Service request with id '${id}' not found`,
        'RESOURCE_NOT_FOUND'
      );
    }
    return request;
  }

  async updateRequestStatus(
    id: string,
    newStatus: RequestStatus
  ): Promise<ServiceRequest> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundError(
        `Service request with id '${id}' not found`,
        'RESOURCE_NOT_FOUND'
      );
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] || [];

    if (!allowed.includes(newStatus)) {
      const allowedMsg =
        allowed.length > 0
          ? `Valid next status is: ${allowed.map((s) => `'${s}'`).join(', ')}`
          : `'${current.status}' is a terminal state. No further transitions permitted`;

      throw new ValidationError(
        `Cannot transition request from '${current.status}' to '${newStatus}'. ${allowedMsg}`,
        'INVALID_STATUS_TRANSITION',
        [
          {
            current_status: current.status,
            attempted_status: newStatus,
            allowed_next_statuses: [...allowed],
          },
        ]
      );
    }

    const updated = await this.repository.updateStatus(id, newStatus);
    if (!updated) {
      throw new NotFoundError(
        `Service request with id '${id}' not found`,
        'RESOURCE_NOT_FOUND'
      );
    }

    return updated;
  }
}
