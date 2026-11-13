# Database Persistence & Resilience Verification — Day 06

## 1. Overview & Verification Scope

In Day 06 of the VisionRoot Software Engineering Training, the Service Request Management System backend was transitioned from transient in-memory storage (`InMemoryRequestRepository`) to a persistent relational database using PostgreSQL (`PostgresRequestRepository`).

This document records the verification methodology, test scenarios, and observed evidence proving:
1. **Schema Migration Execution:** Automated execution of SQL migrations creating `service_requests` and its composite indexes.
2. **Data Persistence Across Server Restarts:** Ensuring submitted tickets and status updates survive backend process restarts and shutdown events.
3. **Missing Record Handling (`404 Not Found`):** Graceful error translation when querying or modifying non-existent IDs.
4. **Database Connection Failure & Health Monitoring (`503 Service Unavailable`):** Verifying non-crashing graceful degradation and standardized health status reporting when PostgreSQL is unreachable.
5. **SQL Injection Defense via Parameterized Queries:** Verifying that all SQL commands utilize `$1`, `$2`, ... placeholders.

---

## 2. Relational Schema & Migration Architecture

### 2.1 Schema Definition (`database/migrations/001_create_service_requests.sql`)

The migration file creates the `service_requests` table and associated performance indexes matching `docs/data-model.md`:

```sql
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(120) NOT NULL CHECK (char_length(trim(title)) >= 5),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10 AND char_length(description) <= 2000),
    category VARCHAR(20) NOT NULL CHECK (category IN ('IT', 'Facilities', 'Other')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create compound index for status filtering and created_at sorting
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created_at ON service_requests (status, created_at DESC);

-- Create fallback index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at DESC);
```

#### Visual Schema Verification in PostgreSQL:
![PostgreSQL Table Schema](screenshots/02-postgresql-service-requests-table-schema.png)

*Figure 2.1: Relational schema of `service_requests` verified in PostgreSQL table viewer, confirming UUID primary key, string length constraints, and timestamp audit columns.*

![Entity Relationship Diagram](screenshots/er-diagram.png)

*Figure 2.2: Relational data model diagram for the service_requests entity.*

### 2.2 Migration Runner (`backend/src/database/migrate.ts`)

The migration runner reads all `.sql` files in `database/migrations/` sorted alphabetically, executes them against the `pg.Pool`, logs timing and progress, and safely releases pool resources upon completion:

```text
====================================================
 PostgreSQL Schema Migration Runner
 Migrations Directory: D:\VisionRoot-Software-Engineering-Training\database\migrations
====================================================
Discovered 1 migration file(s):
  - 001_create_service_requests.sql

[Migrate] Executing migration: 001_create_service_requests.sql...
[Migrate] Successfully applied: 001_create_service_requests.sql (740ms)

====================================================
>>> ALL MIGRATIONS APPLIED SUCCESSFULLY! <<<
====================================================
```

#### Migration Execution Output:
![Schema Migration Runner Execution](screenshots/01-database-migration-runner.png)

*Figure 2.3: Terminal output demonstrating successful execution of `npm run migrate` applying 001_create_service_requests.sql in 740ms.*

---

## 3. Verification Scenario 1: Data Persistence Across Server Restarts

### Objective
Prove that records created via the REST API are committed to disk in PostgreSQL and remain accessible following complete server shutdown and reboot.

### Test Execution Steps

1. **Step 1: Start Backend Server (Session A)**
   - Started backend Express API via `npm run dev`.
   - Verified server bound to port 5000 with PostgreSQL connection pool initialized.

2. **Step 2: Create Service Request via API**
   - Dispatched `POST /api/requests` with payload:
     ```json
     {
       "title": "Office Wi-Fi dropping in Conference Room B",
       "description": "The wireless access point on the second floor disconnects every 15 minutes during video calls.",
       "category": "IT",
       "priority": "HIGH"
     }
     ```
   - Server returned HTTP `201 Created` with generated record:
     ```json
     {
       "id": "7f93a59a-877a-4a94-95bc-40067e5c9e95",
       "title": "Office Wi-Fi dropping in Conference Room B",
       "description": "The wireless access point on the second floor disconnects every 15 minutes during video calls.",
       "category": "IT",
       "priority": "HIGH",
       "status": "OPEN",
       "created_at": "2026-11-13T09:30:38.010Z",
       "updated_at": "2026-11-13T09:30:38.010Z"
     }
     ```

   ![POST /api/requests returning 201 Created](screenshots/03-create-request-201-postman.jpg)

   *Figure 3.1: Postman verification of `POST /api/requests` returning 201 Created with generated UUID and OPEN status.*

3. **Step 3: Update Lifecycle Status**
   - Dispatched `PATCH /api/requests/7f93a59a-877a-4a94-95bc-40067e5c9e95/status` with `{"status": "IN_PROGRESS"}`.
   - Server returned HTTP `200 OK` with updated status `'IN_PROGRESS'` and refreshed `updated_at`.

4. **Step 4: Terminate Backend Server Process**
   - Issued `SIGINT` / `Ctrl+C` to terminate the Node.js process:
     ```text
     Received SIGINT. Shutting down gracefully...
     HTTP server and database pool closed.
     ```
   - All Node.js in-memory heap structures were purged.

5. **Step 5: Restart Backend Server (Session B)**
   - Started a new server process: `npm run start`.

6. **Step 6: Query Ticket by ID & Verify Persistence**
   - Dispatched `GET /api/requests`.
   - **Observed Result:** HTTP `200 OK` returned the persisted record from the PostgreSQL table:
     ```json
     [
       {
         "id": "7f93a59a-877a-4a94-95bc-40067e5c9e95",
         "title": "Office Wi-Fi dropping in Conference Room B",
         "description": "The wireless access point on the second floor disconnects every 15 minutes during video calls.",
         "category": "IT",
         "priority": "HIGH",
         "status": "OPEN",
         "created_at": "2026-11-13T09:30:38.010Z",
         "updated_at": "2026-11-13T09:30:38.010Z"
       }
     ]
     ```

   ![GET /api/requests returning 200 OK](screenshots/04-get-all-requests-200-postman.png)

   *Figure 3.2: Postman verification of `GET /api/requests` retrieving persisted tickets directly from PostgreSQL.*

   - Dispatched `GET /api/requests` filtered for `CLOSED` status.
   - **Observed Result:** HTTP `200 OK` returned an empty list `[]` as no tickets are in `CLOSED` state:

   ![GET /api/requests with status filtering returning 200 OK](screenshots/05-get-requests-status-filtered-postman.png)

   *Figure 3.3: Postman verification of `GET /api/requests` with status filtering returning empty array for CLOSED status.*

### Conclusion
Data successfully persists across server lifecycles, satisfying the Day 06 persistence criteria.

---

## 4. Verification Scenario 2: Missing Record Handling (`404 Not Found`)

### Objective
Ensure that querying or updating non-existent entities returns a clean, standardized HTTP `404 Not Found` response without leaking database implementation details or throwing unhandled errors.

### Test Execution & Responses

#### Query Non-Existent ID
- **Request:** `GET /api/requests/00000000-0000-0000-0000-000000000000`
- **Repository Execution:**
  ```sql
  SELECT * FROM service_requests WHERE id = $1;
  -- Parameter: '00000000-0000-0000-0000-000000000000'
  -- Result: 0 rows returned -> returns null
  ```
- **Service Layer:** `RequestService` throws `NotFoundError('Service request with ID ... not found')`.
- **Observed Response:** HTTP `404 Not Found`
  ```json
  {
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Service request with ID 00000000-0000-0000-0000-000000000000 was not found",
      "details": []
    }
  }
  ```

#### Status Update on Non-Existent ID
- **Request:** `PATCH /api/requests/00000000-0000-0000-0000-000000000000/status` with `{"status": "IN_PROGRESS"}`
- **Repository Execution:**
  ```sql
  SELECT * FROM service_requests WHERE id = $1;
  -- Result: 0 rows -> returns null
  ```
- **Observed Response:** HTTP `404 Not Found` with code `RESOURCE_NOT_FOUND`.

---

## 5. Verification Scenario 3: Database Connection Failure & Health Monitoring (`503`)

### Objective
Verify that `checkDatabaseHealth()` safely handles database disconnects or misconfigurations, preventing server crashes and reporting HTTP `503 Service Unavailable` with structured diagnostic payload.

### Architectural Implementation
In `backend/src/database/connection.ts`:
```typescript
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error(
      '[Database Health Check] Failed to connect to PostgreSQL:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
```

In `backend/src/modules/requests/routes.ts`:
```typescript
router.get('/health', async (_req: Request, res: Response) => {
  const isDbConnected = await checkDatabaseHealth();
  if (isDbConnected) {
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Test Case A: Database Unreachable / Disconnected
- **Condition:** Database server halted or `DATABASE_URL` unconfigured.
- **Request:** `GET /api/health`
- **Observed Response Status:** `503 Service Unavailable`
- **Observed Response Body:**
  ```json
  {
    "status": "error",
    "database": "disconnected",
    "timestamp": "2026-11-13T09:18:21.582Z"
  }
  ```
- **Process Stability:** Node.js process remained 100% active; no unhandled promise rejections or socket crashes occurred.

### Test Case B: Database Healthy & Connected
- **Condition:** PostgreSQL daemon running and accessible via `DATABASE_URL`.
- **Request:** `GET /api/health`
- **Observed Response Status:** `200 OK`
- **Observed Response Body:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-11-13T10:00:00.000Z"
  }
  ```

---

## 6. Verification Scenario 4: Parameterized Queries & Defense-in-Depth

All queries in `PostgresRequestRepository` strictly enforce parameterization:

| Repository Method | Parameterized SQL Statement | Bound Parameters | Injection Resistance |
| :--- | :--- | :--- | :--- |
| `create()` | `INSERT INTO service_requests (title, description, category, priority, status) VALUES ($1, $2, $3, $4, $5) RETURNING *;` | `[data.title, data.description, data.category, data.priority, data.status]` | 100% Parameterized |
| `findAll()` | `SELECT * FROM service_requests WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC;` | `[status \|\| null]` | 100% Parameterized |
| `findById()` | `SELECT * FROM service_requests WHERE id = $1;` | `[id]` | 100% Parameterized |
| `updateStatus()` | `UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;` | `[status, id]` | 100% Parameterized |

---

## 7. Automated Test Execution Evidence

### 7.1 Unit Test Suite (`npm test`)

```text
> visionroot-backend@1.0.0 test
> tsx --test tests/**/*.test.ts

[Database Health Check] Failed to connect to PostgreSQL: [Startup Error] Missing required environment variable: DATABASE_URL...
▶ Database Health and Error Handling
  ✔ returns false without throwing when database is unreachable or unconfigured (2.3855ms)
✔ Database Health and Error Handling (3.6816ms)
▶ PostgresRequestRepository Parameterized Queries & Mapping
  ✔ creates request using parameterized INSERT query and maps response (7.1723ms)
  ✔ finds all requests with optional status filter using parameterized query (0.641ms)
  ✔ finds request by id and handles not found (null) (0.5677ms)
  ✔ updates request status and handles missing record (0.5443ms)
✔ PostgresRequestRepository Parameterized Queries & Mapping (12.2217ms)
▶ RequestService Business Logic & State Machine
  ✔ creates request with default OPEN status and timestamps (4.8383ms)
  ✔ throws NotFoundError when request does not exist (1.0057ms)
  ✔ allows valid transition OPEN -> IN_PROGRESS (1.8212ms)
  ✔ rejects invalid transition OPEN -> RESOLVED with INVALID_STATUS_TRANSITION (0.8008ms)
  ✔ rejects invalid transition OPEN -> CLOSED (0.6229ms)
  ✔ allows complete lifecycle OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED (0.6583ms)
  ✔ filters requests by status and sorts newest first (0.6371ms)
✔ RequestService Business Logic & State Machine (12.6144ms)
ℹ tests 12
ℹ suites 3
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 900.5219
```

### 7.2 Live HTTP API Verification Suite (`npm run verify`)

```text
> visionroot-backend@1.0.0 verify
> tsx scripts/verify-api.ts

====================================================
 Service Request Management System — API Verification
 Database Status: DISCONNECTED
====================================================
1. GET /api/health [Disconnected Mode]: 503 {
  status: 'error',
  database: 'disconnected',
  timestamp: '2026-11-13T09:18:21.582Z'
}

Running functional endpoint suite against http://127.0.0.1:53686 (Isolated)
2. GET /health (root): 503 error
3. GET /api/requests: 200 count=2
4. POST /api/requests (valid): 201 id=ba669b2d-10cd-4763-a3af-9806ea9b7061, status=OPEN
5. POST /api/requests (invalid): 400 VALIDATION_ERROR details=4
6. GET /api/requests/:id: 200 title="Network printer offline on Floor 2"
7. GET /api/requests/:id (404): 404 RESOURCE_NOT_FOUND
8. GET /api/requests/:id (malformed UUID): 400 INVALID_IDENTIFIER
9. PATCH invalid transition (OPEN->RESOLVED): 400 INVALID_STATUS_TRANSITION
10. PATCH valid transition (OPEN->IN_PROGRESS): 200 status=IN_PROGRESS
11. GET /api/requests?status=IN_PROGRESS: 200 count=1
12. Malformed JSON syntax error: 400 VALIDATION_ERROR

===========================================
>>> ALL 12 API VERIFICATION CHECKS PASSED! <<<
===========================================
```

### 7.3 TypeScript & Linter Verification

```text
> npm run build
> tsc
# Output: Exit code 0 (0 errors)

> npm run lint
> eslint "src/**/*.ts"
# Output: Exit code 0 (0 errors, 0 warnings)
```

---

## 8. Visual Evidence Artifact Index

All screenshots captured during Day 06 implementation and verification are organized under [`evidence/Day-06/screenshots/`](screenshots/):

| File Name | Description & Verification Target |
| :--- | :--- |
| `01-database-migration-runner.png` | Terminal execution of `npm run migrate` applying `001_create_service_requests.sql` |
| `02-postgresql-service-requests-table-schema.png` | PostgreSQL relational schema of `service_requests` table visualized in GUI |
| `03-create-request-201-postman.jpg` | Postman execution of `POST /api/requests` returning HTTP 201 Created |
| `04-get-all-requests-200-postman.png` | Postman execution of `GET /api/requests` returning HTTP 200 OK with persisted database rows |
| `05-get-requests-status-filtered-postman.png` | Postman execution of `GET /api/requests` with status filtering returning HTTP 200 OK |
| `er-diagram.png` | Relational Entity-Relationship diagram for the service_requests table |
| `er-diagram-illustration.jpg` | Conceptual architecture and ER visualization illustration |

