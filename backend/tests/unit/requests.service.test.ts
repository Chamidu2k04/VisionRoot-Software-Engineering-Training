import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRequestRepository } from '../../src/modules/requests/repository';
import { RequestService } from '../../src/modules/requests/service';
import { ValidationError, NotFoundError } from '../../src/errors/AppError';

describe('RequestService Business Logic & State Machine', () => {
  it('creates request with default OPEN status and timestamps', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const created = await service.createRequest({
      title: 'Broken chair in conference room',
      description: 'Ergonomic chair wheel broke during morning meeting.',
      category: 'Facilities',
      priority: 'LOW',
    });

    assert.ok(created.id);
    assert.equal(created.status, 'OPEN');
    assert.equal(created.title, 'Broken chair in conference room');
    assert.ok(created.created_at);
    assert.ok(created.updated_at);
  });

  it('throws NotFoundError when request does not exist', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    await assert.rejects(
      async () => {
        await service.getRequestById('non-existent-uuid');
      },
      (err: unknown) => {
        assert.ok(err instanceof NotFoundError);
        assert.equal(err.code, 'RESOURCE_NOT_FOUND');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  it('allows valid transition OPEN -> IN_PROGRESS', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const created = await service.createRequest({
      title: 'Email client sync failed',
      description: 'Outlook fails to sync corporate mailbox after password update.',
      category: 'IT',
      priority: 'HIGH',
    });

    const updated = await service.updateRequestStatus(created.id, 'IN_PROGRESS');
    assert.equal(updated.status, 'IN_PROGRESS');
  });

  it('rejects invalid transition OPEN -> RESOLVED with INVALID_STATUS_TRANSITION', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const created = await service.createRequest({
      title: 'Projector HDMI port damaged',
      description: 'HDMI port loose, cable does not fit securely.',
      category: 'Facilities',
      priority: 'MEDIUM',
    });

    await assert.rejects(
      async () => {
        await service.updateRequestStatus(created.id, 'RESOLVED');
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('rejects invalid transition OPEN -> CLOSED', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const created = await service.createRequest({
      title: 'Replace office badge',
      description: 'Lost RFID badge during commute.',
      category: 'Other',
      priority: 'LOW',
    });

    await assert.rejects(
      async () => {
        await service.updateRequestStatus(created.id, 'CLOSED');
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
        return true;
      }
    );
  });

  it('allows complete lifecycle OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const ticket = await service.createRequest({
      title: 'Software license expired',
      description: 'Visual Studio Enterprise key expired on Nov 1st.',
      category: 'IT',
      priority: 'HIGH',
    });
    assert.equal(ticket.status, 'OPEN');

    const step1 = await service.updateRequestStatus(ticket.id, 'IN_PROGRESS');
    assert.equal(step1.status, 'IN_PROGRESS');

    const step2 = await service.updateRequestStatus(ticket.id, 'RESOLVED');
    assert.equal(step2.status, 'RESOLVED');

    const step3 = await service.updateRequestStatus(ticket.id, 'CLOSED');
    assert.equal(step3.status, 'CLOSED');

    // Terminal state: CLOSED cannot transition anywhere
    await assert.rejects(
      async () => {
        await service.updateRequestStatus(ticket.id, 'IN_PROGRESS');
      },
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.code, 'INVALID_STATUS_TRANSITION');
        return true;
      }
    );
  });

  it('filters requests by status and sorts newest first', async () => {
    const repo = new InMemoryRequestRepository([]);
    const service = new RequestService(repo);

    const r1 = await service.createRequest({
      title: 'Ticket number one test',
      description: 'First test ticket for status filtering verification.',
      category: 'IT',
      priority: 'LOW',
    });

    const r2 = await service.createRequest({
      title: 'Ticket number two test',
      description: 'Second test ticket for status filtering verification.',
      category: 'Facilities',
      priority: 'HIGH',
    });

    await service.updateRequestStatus(r1.id, 'IN_PROGRESS');

    const openList = await service.listRequests('OPEN');
    assert.equal(openList.length, 1);
    assert.equal(openList[0].id, r2.id);

    const inProgressList = await service.listRequests('IN_PROGRESS');
    assert.equal(inProgressList.length, 1);
    assert.equal(inProgressList[0].id, r1.id);
  });
});
