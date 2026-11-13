import {
  CreateRequestInput,
  RequestStatus,
  ServiceRequest,
  ApiErrorResponse,
  ApiErrorPayload,
} from '@/types/request';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const FORCE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export class ApiError extends Error {
  public status: number;
  public payload?: ApiErrorPayload;

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// In-memory mock store for Day 04 preview / fallback when backend is offline
let mockRequests: ServiceRequest[] = [
  {
    id: '7b594b98-1e42-4f36-9b57-69b828ef81c2',
    title: 'Laptop display flickering frequently',
    description:
      'External monitor flashes black every few minutes after recent OS update. Needs driver or adapter check.',
    category: 'IT',
    priority: 'MEDIUM',
    status: 'OPEN',
    created_at: '2026-11-13T09:30:00.000Z',
    updated_at: '2026-11-13T09:30:00.000Z',
  },
  {
    id: '2d14cb89-6a31-4e92-a1f9-91334c9c1187',
    title: 'Air conditioning maintenance needed in Room 302',
    description:
      'Temperature in Room 302 exceeds 28 degrees Celsius during afternoon hours. Thermostat appears unresponsive.',
    category: 'Facilities',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    created_at: '2026-11-13T08:15:00.000Z',
    updated_at: '2026-11-13T09:00:00.000Z',
  },
  {
    id: '9f83a451-b847-493e-862d-05e834612390',
    title: 'Ergonomic keyboard and mouse request for workstation',
    description:
      'Requesting ergonomic peripherals to alleviate wrist strain during prolonged development sessions.',
    category: 'Other',
    priority: 'LOW',
    status: 'RESOLVED',
    created_at: '2026-11-12T14:00:00.000Z',
    updated_at: '2026-11-13T07:45:00.000Z',
  },
  {
    id: '4c76b912-32a1-4328-98e1-55bb247a3219',
    title: 'Broken desk chair cylinder in Pod 4',
    description:
      'The pneumatic cylinder on the desk chair has failed and will not maintain height.',
    category: 'Facilities',
    priority: 'LOW',
    status: 'CLOSED',
    created_at: '2026-11-11T11:20:00.000Z',
    updated_at: '2026-11-12T16:10:00.000Z',
  },
];

const ALLOWED_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

// Helper to simulate mock network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock handlers
const mockApi = {
  async getRequests(status?: RequestStatus): Promise<ServiceRequest[]> {
    await delay(200);
    const filtered = status
      ? mockRequests.filter((r) => r.status === status)
      : [...mockRequests];
    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getRequestById(id: string): Promise<ServiceRequest> {
    await delay(150);
    const item = mockRequests.find((r) => r.id === id);
    if (!item) {
      throw new ApiError(404, `Service request with id '${id}' not found`, {
        code: 'RESOURCE_NOT_FOUND',
        message: `Service request with id '${id}' not found`,
      });
    }
    return item;
  },

  async createRequest(payload: CreateRequestInput): Promise<ServiceRequest> {
    await delay(250);
    const trimmedTitle = payload.title?.trim() || '';
    const trimmedDescription = payload.description?.trim() || '';

    if (trimmedTitle.length < 5 || trimmedTitle.length > 120) {
      throw new ApiError(400, 'Title must be between 5 and 120 characters', {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for request payload',
        details: [
          {
            field: 'title',
            issue: 'Title must be between 5 and 120 characters',
          },
        ],
      });
    }

    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      throw new ApiError(
        400,
        'Description must be between 10 and 2000 characters',
        {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for request payload',
          details: [
            {
              field: 'description',
              issue: 'Description must be between 10 and 2000 characters',
            },
          ],
        }
      );
    }

    const now = new Date().toISOString();
    const newRequest: ServiceRequest = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req-${Date.now()}`,
      title: trimmedTitle,
      description: trimmedDescription,
      category: payload.category,
      priority: payload.priority,
      status: 'OPEN',
      created_at: now,
      updated_at: now,
    };

    mockRequests = [newRequest, ...mockRequests];
    return newRequest;
  },

  async updateRequestStatus(
    id: string,
    nextStatus: RequestStatus
  ): Promise<ServiceRequest> {
    await delay(200);
    const item = mockRequests.find((r) => r.id === id);
    if (!item) {
      throw new ApiError(404, `Service request with id '${id}' not found`, {
        code: 'RESOURCE_NOT_FOUND',
        message: `Service request with id '${id}' not found`,
      });
    }

    const allowed = ALLOWED_TRANSITIONS[item.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new ApiError(
        400,
        `Cannot transition request from '${item.status}' to '${nextStatus}'. Valid next status is: ${allowed.join(', ') || 'none'}`,
        {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot transition request from '${item.status}' to '${nextStatus}'.`,
          details: [
            {
              current_status: item.status,
              attempted_status: nextStatus,
              allowed_next_statuses: allowed,
            },
          ],
        }
      );
    }

    item.status = nextStatus;
    item.updated_at = new Date().toISOString();
    return { ...item };
  },
};

/**
 * Fetch wrapper that communicates with the live Express API.
 * Automatically parses backend standardized error envelopes ({ error: { code, message, details } })
 * and propagates network/API errors cleanly without silent fallback to mock data.
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let errorPayload: ApiErrorPayload | undefined;
      try {
        const errorJson: ApiErrorResponse = await res.json();
        if (errorJson && typeof errorJson === 'object' && errorJson.error) {
          errorPayload = errorJson.error;
        }
      } catch {
        // Response was not JSON (e.g., gateway 502/504 or network proxy response)
      }

      const message =
        errorPayload?.message ||
        `Request failed with status ${res.status}: ${res.statusText || 'Server Error'}`;

      throw new ApiError(
        res.status,
        message,
        errorPayload || {
          code: `HTTP_${res.status}`,
          message,
          details: [],
        }
      );
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error (offline, connection refused, CORS failure, etc.)
    const errorMessage =
      error instanceof Error && error.message
        ? `Unable to connect to backend API server at ${API_BASE_URL} (${error.message}). Please verify the server is running.`
        : `Network error: Failed to communicate with backend at ${API_BASE_URL}.`;

    throw new ApiError(0, errorMessage, {
      code: 'NETWORK_ERROR',
      message: errorMessage,
      details: [],
    });
  }
}

export const requestsApi = {
  /**
   * Retrieves a list of service requests, optionally filtered by status.
   * Dispatches GET /api/requests or GET /api/requests?status={status}.
   */
  async getRequests(status?: RequestStatus): Promise<ServiceRequest[]> {
    if (FORCE_MOCK) {
      return mockApi.getRequests(status);
    }
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiFetch<ServiceRequest[]>(`/requests${query}`, { method: 'GET' });
  },

  /**
   * Retrieves full details for a single service request by ID.
   * Dispatches GET /api/requests/:id.
   */
  async getRequestById(id: string): Promise<ServiceRequest> {
    if (FORCE_MOCK) {
      return mockApi.getRequestById(id);
    }
    return apiFetch<ServiceRequest>(`/requests/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  },

  /**
   * Submits and persists a new service request with initial status 'OPEN'.
   * Dispatches POST /api/requests.
   */
  async createRequest(payload: CreateRequestInput): Promise<ServiceRequest> {
    if (FORCE_MOCK) {
      return mockApi.createRequest(payload);
    }
    return apiFetch<ServiceRequest>('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Transitions the lifecycle status of an existing request.
   * Dispatches PATCH /api/requests/:id/status.
   */
  async updateRequestStatus(
    id: string,
    status: RequestStatus
  ): Promise<ServiceRequest> {
    if (FORCE_MOCK) {
      return mockApi.updateRequestStatus(id, status);
    }
    return apiFetch<ServiceRequest>(
      `/requests/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
  },
};
