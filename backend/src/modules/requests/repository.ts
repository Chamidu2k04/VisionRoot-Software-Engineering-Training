import { randomUUID } from 'node:crypto';
import { QueryResultRow, QueryResult } from 'pg';
import { RequestStatus, ServiceRequest } from './types';
import { query as defaultQuery } from '../../database/connection';

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

interface ServiceRequestDbRow extends QueryResultRow {
  id: string;
  title: string;
  description: string;
  category: ServiceRequest['category'];
  priority: ServiceRequest['priority'];
  status: RequestStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Maps a raw PostgreSQL query row into a typed ServiceRequest domain object.
 */
function mapRowToServiceRequest(row: ServiceRequestDbRow): ServiceRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : new Date(row.updated_at).toISOString(),
  };
}

/**
 * PostgreSQL Implementation of IRequestRepository.
 * Uses parameterized queries to prevent SQL injection and ensure transactional consistency.
 */
export class PostgresRequestRepository implements IRequestRepository {
  constructor(
    private readonly queryFn: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ) => Promise<QueryResult<R>> = defaultQuery
  ) {}

  async create(data: CreateServiceRequestData): Promise<ServiceRequest> {
    const sql = `
      INSERT INTO service_requests (title, description, category, priority, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const params = [data.title, data.description, data.category, data.priority, data.status];
    const result = await this.queryFn<ServiceRequestDbRow>(sql, params);
    return mapRowToServiceRequest(result.rows[0]);
  }

  async findAll(status?: RequestStatus): Promise<ServiceRequest[]> {
    const sql = `
      SELECT * FROM service_requests
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC;
    `;
    const params = [status || null];
    const result = await this.queryFn<ServiceRequestDbRow>(sql, params);
    return result.rows.map(mapRowToServiceRequest);
  }

  async findById(id: string): Promise<ServiceRequest | null> {
    const sql = `
      SELECT * FROM service_requests
      WHERE id = $1;
    `;
    const params = [id];
    const result = await this.queryFn<ServiceRequestDbRow>(sql, params);
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToServiceRequest(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: RequestStatus
  ): Promise<ServiceRequest | null> {
    const sql = `
      UPDATE service_requests
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const params = [status, id];
    const result = await this.queryFn<ServiceRequestDbRow>(sql, params);
    if (result.rows.length === 0) {
      return null;
    }
    return mapRowToServiceRequest(result.rows[0]);
  }
}

/**
 * In-memory repository implementation preserved for unit tests and isolated environments.
 */
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
