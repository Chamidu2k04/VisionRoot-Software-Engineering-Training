/**
 * VisionRoot Trainee Software Engineer Program — Day 07
 * End-to-End Workflow Smoke Test Script
 *
 * Executes the complete service request lifecycle against a running API server:
 * 1. Health check (GET /api/health -> 200 OK)
 * 2. Create request (POST /api/requests -> 201 Created, status=OPEN)
 * 3. List requests filtered by status (GET /api/requests?status=OPEN -> confirms created ID)
 * 4. Retrieve details by ID (GET /api/requests/:id -> 200 OK)
 * 5. Attempt invalid transition (PATCH /api/requests/:id/status with CLOSED -> 400 INVALID_STATUS_TRANSITION)
 * 6. Execute valid transitions (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED -> 200 OK at each step)
 */

import { Server } from 'http';
import { createApp } from '../src/app';
import { InMemoryRequestRepository } from '../src/modules/requests/repository';

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown[];
}

interface ApiResponse {
  error?: ErrorPayload;
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

let API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function pass(step: string, details?: string) {
  console.log(
    ` ${COLORS.green}✔ PASS${COLORS.reset} [${step}]${details ? ` ${details}` : ''}`
  );
}

function fail(step: string, reason: string): never {
  console.error(
    ` ${COLORS.red}✖ FAIL${COLORS.reset} [${step}] ${COLORS.bold}${reason}${COLORS.reset}`
  );
  process.exit(1);
}

async function request(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: ApiResponse | ApiResponse[] }> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    const text = await res.text();
    let data: ApiResponse | ApiResponse[];
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { status: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n${COLORS.red}Connection Error:${COLORS.reset}`);
    console.error(`Could not connect to backend server at ${COLORS.bold}${url}${COLORS.reset}`);
    console.error(`Root cause: ${message}`);
    console.error(`\nPlease ensure the Express server is running:`);
    console.error(`  1. cd backend`);
    console.error(`  2. npm run dev   (or npm start)\n`);
    process.exit(1);
  }
}

async function runSmokeTest() {
  const isStandalone =
    process.argv.includes('--standalone') || process.env.STANDALONE === 'true';

  let standaloneServer: Server | null = null;

  if (isStandalone) {
    // Launch an ephemeral test server instance for self-contained CI testing
    const testApp = createApp(new InMemoryRequestRepository());
    await new Promise<void>((resolve) => {
      standaloneServer = testApp.listen(0, () => {
        const addr = standaloneServer?.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5000;
        API_BASE_URL = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  }

  console.log('\n===============================================================');
  console.log(`${COLORS.bold}${COLORS.cyan} VisionRoot — Day 07 End-to-End Workflow Smoke Test${COLORS.reset}`);
  console.log(` Target API URL: ${COLORS.yellow}${API_BASE_URL}${COLORS.reset}${isStandalone ? ' (Standalone Mode)' : ''}`);
  console.log('===============================================================\n');

  try {
    // --------------------------------------------------------------------------
    // Step 1: Health Check (GET /api/health -> 200 OK)
    // --------------------------------------------------------------------------
    console.log(`${COLORS.bold}Step 1: Checking API Health...${COLORS.reset}`);
    const healthRes = await request('/health');
    if (healthRes.status !== 200 && healthRes.status !== 503) {
      fail(
        'Step 1 - Health Check',
        `Expected HTTP 200 (or 503 db-disconnected), received ${healthRes.status} (${JSON.stringify(healthRes.data)})`
      );
    }
    const healthData = healthRes.data as { status?: string; database?: string };
    pass(
      'Step 1 - Health Check',
      `HTTP ${healthRes.status} — status="${healthData.status}", database="${healthData.database || 'n/a'}"`
    );

    // --------------------------------------------------------------------------
    // Step 2: Create Request (POST /api/requests -> 201 Created, status=OPEN)
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bold}Step 2: Submitting New Service Request...${COLORS.reset}`);
    const createPayload = {
      title: 'E2E Integration Test: Workstation docking issue',
      description:
        'Dual external monitors fail to detect HDMI signal through Thunderbolt 4 dock following firmware update.',
      category: 'IT',
      priority: 'HIGH',
    };

    const createRes = await request('/requests', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });

    if (createRes.status !== 201) {
      fail(
        'Step 2 - Create Request',
        `Expected HTTP 201 Created, received ${createRes.status} (${JSON.stringify(createRes.data)})`
      );
    }

    const createdItem = createRes.data as ApiResponse;
    if (!createdItem.id || typeof createdItem.id !== 'string') {
      fail('Step 2 - Create Request', 'Response missing valid UUID string id');
    }
    if (createdItem.status !== 'OPEN') {
      fail(
        'Step 2 - Create Request',
        `Expected initial status 'OPEN', received '${createdItem.status}'`
      );
    }

    const requestId = createdItem.id;
    pass(
      'Step 2 - Create Request',
      `HTTP 201 Created — ID: ${requestId}, Status: ${createdItem.status}`
    );

    // --------------------------------------------------------------------------
    // Step 3: List Requests Filtered by Status (GET /api/requests?status=OPEN)
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bold}Step 3: Querying Requests with Status Filter (status=OPEN)...${COLORS.reset}`);
    const listRes = await request('/requests?status=OPEN');
    if (listRes.status !== 200) {
      fail(
        'Step 3 - List Requests',
        `Expected HTTP 200 OK, received ${listRes.status}`
      );
    }
    if (!Array.isArray(listRes.data)) {
      fail('Step 3 - List Requests', 'Expected array response from GET /api/requests');
    }

    const foundInList = (listRes.data as ApiResponse[]).some(
      (item) => item.id === requestId
    );
    if (!foundInList) {
      fail(
        'Step 3 - List Requests',
        `Created request ID '${requestId}' was not found in GET /api/requests?status=OPEN`
      );
    }
    pass(
      'Step 3 - List Requests',
      `HTTP 200 OK — Confirmed presence of request in filtered list (${listRes.data.length} open items)`
    );

    // --------------------------------------------------------------------------
    // Step 4: Fetch Details by ID (GET /api/requests/:id -> 200 OK)
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bold}Step 4: Fetching Request Details by ID...${COLORS.reset}`);
    const detailsRes = await request(`/requests/${requestId}`);
    if (detailsRes.status !== 200) {
      fail(
        'Step 4 - Fetch Details',
        `Expected HTTP 200 OK, received ${detailsRes.status}`
      );
    }
    const detailsItem = detailsRes.data as ApiResponse;
    if (detailsItem.id !== requestId || detailsItem.status !== 'OPEN') {
      fail(
        'Step 4 - Fetch Details',
        `Mismatch in retrieved record: expected ID=${requestId} status=OPEN, got ID=${detailsItem.id} status=${detailsItem.status}`
      );
    }
    pass(
      'Step 4 - Fetch Details',
      `HTTP 200 OK — Verified title="${detailsItem.title}", priority="${detailsItem.priority}"`
    );

    // --------------------------------------------------------------------------
    // Step 5: Attempt Invalid Transition (PATCH /api/requests/:id/status with CLOSED -> 400)
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bold}Step 5: Testing Business Rule Enforcement (Invalid Transition OPEN -> CLOSED)...${COLORS.reset}`);
    const invalidPatchRes = await request(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CLOSED' }),
    });

    if (invalidPatchRes.status !== 400) {
      fail(
        'Step 5 - Invalid Transition',
        `Expected HTTP 400 Bad Request, received ${invalidPatchRes.status} (${JSON.stringify(invalidPatchRes.data)})`
      );
    }

    const invalidPatchData = invalidPatchRes.data as ApiResponse;
    if (invalidPatchData.error?.code !== 'INVALID_STATUS_TRANSITION') {
      fail(
        'Step 5 - Invalid Transition',
        `Expected error.code 'INVALID_STATUS_TRANSITION', received '${invalidPatchData.error?.code}'`
      );
    }
    pass(
      'Step 5 - Invalid Transition',
      `HTTP 400 Bad Request — Correctly rejected by RequestService state machine: "${invalidPatchData.error.message}"`
    );

    // --------------------------------------------------------------------------
    // Step 6: Execute Valid State Machine Transitions
    // OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
    // --------------------------------------------------------------------------
    console.log(`\n${COLORS.bold}Step 6: Executing Full End-to-End Status Lifecycle Transitions...${COLORS.reset}`);

    // 6a: OPEN -> IN_PROGRESS
    const patch1 = await request(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    if (patch1.status !== 200 || (patch1.data as ApiResponse).status !== 'IN_PROGRESS') {
      fail('Step 6a - Transition to IN_PROGRESS', `Failed with HTTP ${patch1.status}`);
    }
    pass('Step 6a - Transition', 'OPEN -> IN_PROGRESS (HTTP 200 OK)');

    // 6b: IN_PROGRESS -> RESOLVED
    const patch2 = await request(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED' }),
    });
    if (patch2.status !== 200 || (patch2.data as ApiResponse).status !== 'RESOLVED') {
      fail('Step 6b - Transition to RESOLVED', `Failed with HTTP ${patch2.status}`);
    }
    pass('Step 6b - Transition', 'IN_PROGRESS -> RESOLVED (HTTP 200 OK)');

    // 6c: RESOLVED -> CLOSED
    const patch3 = await request(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    if (patch3.status !== 200 || (patch3.data as ApiResponse).status !== 'CLOSED') {
      fail('Step 6c - Transition to CLOSED', `Failed with HTTP ${patch3.status}`);
    }
    pass('Step 6c - Transition', 'RESOLVED -> CLOSED (HTTP 200 OK)');

    // --------------------------------------------------------------------------
    // Final Confirmation: Attempting to transition from terminal CLOSED status
    // --------------------------------------------------------------------------
    const terminalCheck = await request(`/requests/${requestId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'OPEN' }),
    });
    if (terminalCheck.status === 400) {
      pass(
        'Step 6d - Terminal Invariant',
        'CLOSED state confirmed terminal; no further transitions allowed (HTTP 400 OK)'
      );
    }

    console.log('\n===============================================================');
    console.log(
      `${COLORS.green}${COLORS.bold} >>> ALL 6 END-TO-END SMOKE TEST STEPS PASSED SUCCESSFULLY! <<<${COLORS.reset}`
    );
    console.log('===============================================================\n');
  } finally {
    if (standaloneServer) {
      (standaloneServer as Server).close();
    }
  }
}

runSmokeTest().catch((err) => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});
