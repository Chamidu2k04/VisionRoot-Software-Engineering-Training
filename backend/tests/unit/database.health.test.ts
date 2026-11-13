import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkDatabaseHealth } from '../../src/database/connection';

describe('Database Health and Error Handling', () => {
  it('returns false without throwing when database is unreachable or unconfigured', async () => {
    // When DATABASE_URL is not configured or server is unreachable, health check safely returns false
    const isHealthy = await checkDatabaseHealth();
    assert.equal(typeof isHealthy, 'boolean');
    // Without active DB credentials in CI/test environment, it should evaluate to false
    assert.equal(isHealthy, false);
  });
});
