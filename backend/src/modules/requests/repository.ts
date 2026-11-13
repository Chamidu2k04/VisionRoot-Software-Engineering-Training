import { randomUUID } from 'node:crypto';
import { RequestStatus, ServiceRequest } from './types';

export interface CreateServiceRequestData {
  title: string;
  description: string;
  category: ServiceRequest['category'];
  priority: ServiceRequest['priority'];
  status: RequestStatus;
}

export interface IRequestRepository {
  create(data: CreateServiceRequestData): Promise<ServiceRequest>;
  findAll(status?: RequestStatus): Promise<ServiceRequest[]>;
  findById(id: string): Promise<ServiceRequest | null>;
  updateStatus(id: string, status: RequestStatus): Promise<ServiceRequest | null>;
}

export class InMemoryRequestRepository implements IRequestRepository {
  private requests: Map<string, ServiceRequest> = new Map();

  constructor(initialData?: ServiceRequest[]) {
    if (initialData !== undefined) {
      initialData.forEach((req) => this.requests.set(req.id, req));
    } else {
      // Seed initial baseline records matching API contract documentation
      const seed1: ServiceRequest = {
        id: '7b594b98-1e42-4f36-9b57-69b828ef81c2',
        title: 'Laptop display flickering frequently',
        description:
          'External monitor flashes black every few minutes after recent OS update.',
        category: 'IT',
        priority: 'MEDIUM',
        status: 'OPEN',
        created_at: '2026-11-12T10:30:00.000Z',
        updated_at: '2026-11-12T10:30:00.000Z',
      };
      const seed2: ServiceRequest = {
        id: '2d14cb89-6a31-4e92-a1f9-91334c9c1187',
        title: 'Air conditioning maintenance needed in Room 302',
        description:
          'Temperature in Room 302 exceeds 28 degrees Celsius during afternoon hours.',
        category: 'Facilities',
        priority: 'HIGH',
        status: 'OPEN',
        created_at: '2026-11-12T09:15:00.000Z',
        updated_at: '2026-11-12T09:15:00.000Z',
      };
      this.requests.set(seed1.id, seed1);
      this.requests.set(seed2.id, seed2);
    }
  }

  async create(data: CreateServiceRequestData): Promise<ServiceRequest> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newRequest: ServiceRequest = {
      id,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: data.status,
      created_at: now,
      updated_at: now,
    };

    this.requests.set(id, newRequest);
    return { ...newRequest };
  }

  async findAll(status?: RequestStatus): Promise<ServiceRequest[]> {
    let list = Array.from(this.requests.values());

    if (status) {
      list = list.filter((req) => req.status === status);
    }

    // Sort newest first (created_at descending)
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    const found = this.requests.get(id);
    return found ? { ...found } : null;
  }

  async updateStatus(
    id: string,
    status: RequestStatus
  ): Promise<ServiceRequest | null> {
    const existing = this.requests.get(id);
    if (!existing) {
      return null;
    }

    const updated: ServiceRequest = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
    };

    this.requests.set(id, updated);
    return { ...updated };
  }
}
