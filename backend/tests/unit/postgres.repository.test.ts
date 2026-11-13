import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QueryResult, QueryResultRow } from 'pg';
import { PostgresRequestRepository } from '../../src/modules/requests/repository';
import { CreateServiceRequestData } from '../../src/modules/requests/repository';

describe('PostgresRequestRepository Parameterized Queries & Mapping', () => {
  it('creates request using parameterized INSERT query and maps response', async () => {
    let capturedSql = '';
    let capturedParams: unknown[] | undefined;

    const mockQuery = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ): Promise<QueryResult<R>> => {
      capturedSql = text;
      capturedParams = params;
      const fakeRow = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Network printer offline',
        description: 'Printer on 2nd floor offline after power surge.',
        category: 'IT',
        priority: 'HIGH',
        status: 'OPEN',
        created_at: new Date('2026-11-13T10:00:00.000Z'),
        updated_at: new Date('2026-11-13T10:00:00.000Z'),
      };
      return {
        rows: [fakeRow as unknown as R],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    };

    const repo = new PostgresRequestRepository(mockQuery);
    const data: CreateServiceRequestData = {
      title: 'Network printer offline',
      description: 'Printer on 2nd floor offline after power surge.',
      category: 'IT',
      priority: 'HIGH',
      status: 'OPEN',
    };

    const result = await repo.create(data);

    assert.ok(capturedSql.includes('INSERT INTO service_requests'));
    assert.deepEqual(capturedParams, [
      'Network printer offline',
      'Printer on 2nd floor offline after power surge.',
      'IT',
      'HIGH',
      'OPEN',
    ]);
    assert.equal(result.id, '11111111-1111-1111-1111-111111111111');
    assert.equal(result.status, 'OPEN');
    assert.equal(result.created_at, '2026-11-13T10:00:00.000Z');
    assert.equal(result.updated_at, '2026-11-13T10:00:00.000Z');
  });

  it('finds all requests with optional status filter using parameterized query', async () => {
    let capturedSql = '';
    let capturedParams: unknown[] | undefined;

    const mockQuery = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ): Promise<QueryResult<R>> => {
      capturedSql = text;
      capturedParams = params;
      const fakeRows = [
        {
          id: '22222222-2222-2222-2222-222222222222',
          title: 'AC leaking in server room',
          description: 'Water dripping near rack B.',
          category: 'Facilities',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          created_at: '2026-11-13T09:00:00.000Z',
          updated_at: '2026-11-13T09:30:00.000Z',
        },
      ];
      return {
        rows: fakeRows as unknown as R[],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      };
    };

    const repo = new PostgresRequestRepository(mockQuery);

    // 1. With filter
    const filtered = await repo.findAll('IN_PROGRESS');
    assert.ok(capturedSql.includes('SELECT * FROM service_requests'));
    assert.ok(capturedSql.includes('ORDER BY created_at DESC'));
    assert.deepEqual(capturedParams, ['IN_PROGRESS']);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].status, 'IN_PROGRESS');

    // 2. Without filter (status is undefined -> passes null to $1)
    await repo.findAll();
    assert.deepEqual(capturedParams, [null]);
  });

  it('finds request by id and handles not found (null)', async () => {
    let callCount = 0;
    const mockQuery = async <R extends QueryResultRow = QueryResultRow>(
      _text: string,
      params?: unknown[]
    ): Promise<QueryResult<R>> => {
      callCount++;
      const id = params?.[0];
      if (id === 'existing-id') {
        return {
          rows: [
            {
              id: 'existing-id',
              title: 'Keycard reader broken',
              description: 'Door 4 card swipe not responding.',
              category: 'Facilities',
              priority: 'LOW',
              status: 'OPEN',
              created_at: new Date('2026-11-13T08:00:00.000Z'),
              updated_at: new Date('2026-11-13T08:00:00.000Z'),
            } as unknown as R,
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        };
      }
      return {
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      };
    };

    const repo = new PostgresRequestRepository(mockQuery);

    const found = await repo.findById('existing-id');
    assert.ok(found);
    assert.equal(found?.id, 'existing-id');

    const notFound = await repo.findById('non-existent-id');
    assert.equal(notFound, null);
    assert.equal(callCount, 2);
  });

  it('updates request status and handles missing record', async () => {
    const mockQuery = async <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ): Promise<QueryResult<R>> => {
      assert.ok(text.includes('UPDATE service_requests'));
      assert.ok(text.includes('SET status = $1, updated_at = NOW()'));
      assert.ok(text.includes('WHERE id = $2'));
      assert.ok(text.includes('RETURNING *'));
      const [status, id] = params || [];
      if (id === 'valid-id') {
        return {
          rows: [
            {
              id: 'valid-id',
              title: 'Broken chair in conference room',
              description: 'Ergonomic chair wheel broke during morning meeting.',
              category: 'Facilities',
              priority: 'LOW',
              status,
              created_at: new Date('2026-11-13T08:00:00.000Z'),
              updated_at: new Date('2026-11-13T08:30:00.000Z'),
            } as unknown as R,
          ],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        };
      }
      return {
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      };
    };

    const repo = new PostgresRequestRepository(mockQuery);

    const updated = await repo.updateStatus('valid-id', 'IN_PROGRESS');
    assert.ok(updated);
    assert.equal(updated?.status, 'IN_PROGRESS');

    const missing = await repo.updateStatus('unknown-id', 'RESOLVED');
    assert.equal(missing, null);
  });
});
