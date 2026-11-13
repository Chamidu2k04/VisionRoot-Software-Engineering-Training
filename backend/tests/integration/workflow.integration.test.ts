import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRequestRepository } from '../../src/modules/requests/repository';
import { RequestService } from '../../src/modules/requests/service';
import { RequestController } from '../../src/modules/requests/controller';
import { Request, Response } from 'express';

// Helper to create mock Express Request and Response objects
function createMockContext(overrides: Partial<Request> = {}) {
  let statusCode = 200;
  let responseBody: unknown = null;

  const req = {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: unknown) {
      responseBody = body;
      return res;
    },
  } as unknown as Response;

  let nextError: unknown = null;
  const next = (err?: unknown) => {
    nextError = err;
  };

  return {
    req,
    res,
    next,
    getStatus: () => statusCode,
    getBody: () => responseBody,
    getError: () => nextError,
  };
}

describe('Full-Stack Integration End-to-End Workflow (Controller & Service)', () => {
  const repo = new InMemoryRequestRepository();
  const service = new RequestService(repo);
  const controller = new RequestController(service);

  let createdId: string;

  it('Step 1: Creates request via POST with 201 Created and initial status OPEN', async () => {
    const { req, res, next, getStatus, getBody } = createMockContext({
      body: {
        title: 'Workstation monitor flickering intermittently',
        description: 'External display flashes black several times per hour during compilation.',
        category: 'IT',
        priority: 'HIGH',
      },
    });

    await controller.create(req, res, next);

    assert.equal(getStatus(), 201);
    const body = getBody() as { id: string; status: string; title: string };
    assert.ok(body.id, 'Request must have an ID');
    assert.equal(body.status, 'OPEN');
    assert.equal(body.title, 'Workstation monitor flickering intermittently');
    createdId = body.id;
  });

  it('Step 2: Lists requests via GET with ?status=OPEN and confirms presence', async () => {
    const { req, res, next, getStatus, getBody } = createMockContext({
      query: { status: 'OPEN' },
    });

    await controller.list(req, res, next);

    assert.equal(getStatus(), 200);
    const body = getBody() as Array<{ id: string; status: string }>;
    assert.ok(Array.isArray(body));
    const found = body.find((r) => r.id === createdId);
    assert.ok(found, `Created request ${createdId} should be in OPEN list`);
  });

  it('Step 3: Fetches request details via GET /api/requests/:id with 200 OK', async () => {
    const { req, res, next, getStatus, getBody } = createMockContext({
      params: { id: createdId },
    });

    await controller.getById(req, res, next);

    assert.equal(getStatus(), 200);
    const body = getBody() as { id: string; status: string };
    assert.equal(body.id, createdId);
    assert.equal(body.status, 'OPEN');
  });

  it('Step 4: Rejects invalid transition (OPEN -> CLOSED) with ValidationError / INVALID_STATUS_TRANSITION', async () => {
    const { req, res, next, getError } = createMockContext({
      params: { id: createdId },
      body: { status: 'CLOSED' },
    });

    await controller.updateStatus(req, res, next);

    const err = getError() as { statusCode: number; code: string; message: string };
    assert.ok(err, 'Should pass error to next()');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
    assert.ok(err.message.includes('Cannot transition request from \'OPEN\' to \'CLOSED\''));
  });

  it('Step 5: Executes complete valid lifecycle (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED)', async () => {
    // 5a. OPEN -> IN_PROGRESS
    const ctx1 = createMockContext({
      params: { id: createdId },
      body: { status: 'IN_PROGRESS' },
    });
    await controller.updateStatus(ctx1.req, ctx1.res, ctx1.next);
    assert.equal(ctx1.getStatus(), 200);
    assert.equal((ctx1.getBody() as { status: string }).status, 'IN_PROGRESS');

    // 5b. IN_PROGRESS -> RESOLVED
    const ctx2 = createMockContext({
      params: { id: createdId },
      body: { status: 'RESOLVED' },
    });
    await controller.updateStatus(ctx2.req, ctx2.res, ctx2.next);
    assert.equal(ctx2.getStatus(), 200);
    assert.equal((ctx2.getBody() as { status: string }).status, 'RESOLVED');

    // 5c. RESOLVED -> CLOSED
    const ctx3 = createMockContext({
      params: { id: createdId },
      body: { status: 'CLOSED' },
    });
    await controller.updateStatus(ctx3.req, ctx3.res, ctx3.next);
    assert.equal(ctx3.getStatus(), 200);
    assert.equal((ctx3.getBody() as { status: string }).status, 'CLOSED');
  });

  it('Step 6: Enforces CLOSED terminal state invariant against further transitions', async () => {
    const { req, res, next, getError } = createMockContext({
      params: { id: createdId },
      body: { status: 'OPEN' },
    });

    await controller.updateStatus(req, res, next);

    const err = getError() as { statusCode: number; code: string; message: string };
    assert.ok(err, 'Should reject transition from terminal state');
    assert.equal(err.statusCode, 400);
    assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
    assert.ok(err.message.includes('terminal state'));
  });
});
