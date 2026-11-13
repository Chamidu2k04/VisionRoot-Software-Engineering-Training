# Daily Evidence Record — Day 06

- **Date:** 2026-11-13
- **Day / Topic:** Day 06 — Database and Persistence (PostgreSQL)
- **Objective:** Transition the Service Request Management System backend from transient in-memory storage to persistent PostgreSQL storage. Implement repeatable SQL migrations, parameterized repository queries, database connection pooling via `pg`, connection health monitoring (`200` vs `503`), and prove data persistence across server restarts while preserving strict architectural layer boundaries.
- **What I learned:**
  - How to configure and manage a production-grade PostgreSQL connection pool (`pg.Pool`) in a TypeScript modular monolith, including idle client error handling, connection string validation, and graceful resource cleanup on process signals (`SIGINT`, `SIGTERM`).
  - The architectural power of the Dependency Inversion Principle: by preserving the `IRequestRepository` interface established in Day 05, the data persistence tier was completely transitioned from `InMemoryRequestRepository` to `PostgresRequestRepository` without changing a single line of business logic in `RequestService` or routing logic in `RequestController`.
  - How to design idempotent, safe SQL schema migrations with `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`, `CREATE TABLE IF NOT EXISTS`, and composite indexes (`CREATE INDEX IF NOT EXISTS`) matching the relational specification in `docs/data-model.md`.
  - The critical importance of parameterized SQL queries (`$1`, `$2`, ...) to provide bulletproof defense against SQL injection attacks while allowing the database engine to cache execution query plans.
  - Designing resilient health probes (`GET /api/health` and `GET /health`): how to execute non-intrusive ping queries (`SELECT 1`) that return HTTP `200 OK` (`database: "connected"`) when healthy or degrade gracefully to HTTP `503 Service Unavailable` (`database: "disconnected"`) without throwing unhandled exceptions or crashing the Node.js process.
- **What I implemented:**
  - Authored SQL migration script `database/migrations/001_create_service_requests.sql` creating the `service_requests` table with UUID primary keys (`gen_random_uuid()`), field length check constraints (title $\ge$ 5, description $\ge$ 10 and $\le$ 2000), categorical enums (`IT`, `Facilities`, `Other`), priority enums (`LOW`, `MEDIUM`, `HIGH`), status workflow enums (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), automatic timestamps (`TIMESTAMPTZ DEFAULT NOW()`), and compound index `idx_service_requests_status_created_at`.
  - Updated `backend/package.json` with `pg` dependency, `@types/pg` devDependency, and added the `"migrate": "tsx src/database/migrate.ts"` script.
  - Enhanced environment module `backend/src/config/environment.ts` with `DATABASE_URL` parsing and a dedicated `getDatabaseUrl()` helper throwing a clear startup error when `DATABASE_URL` is missing.
  - Implemented database connection module `backend/src/database/connection.ts` featuring singleton `pg.Pool` initialization, pooled `query()` helper, non-crashing `checkDatabaseHealth()` probe, and `closePool()` cleanup.
  - Created automated migration runner `backend/src/database/migrate.ts` resolving the migrations directory across multiple working directories, sorting `.sql` files alphabetically, executing migrations in sequence with timing logs, and closing the pool upon completion.
  - Built `PostgresRequestRepository` in `backend/src/modules/requests/repository.ts` implementing `IRequestRepository` using parameterized SQL queries for `create`, `findAll`, `findById`, and `updateStatus`, with typed mapping from database rows to domain models.
  - Wired `PostgresRequestRepository` into the Express router in `backend/src/modules/requests/routes.ts` and Express app in `backend/src/app.ts`.
  - Updated health check endpoints (`GET /api/health` and `GET /health`) to verify database connectivity via `checkDatabaseHealth()`, returning HTTP `200` when connected or HTTP `503` when unreachable.
  - Added graceful database pool cleanup on `SIGINT` and `SIGTERM` signals in `backend/src/server.ts`.
  - Authored comprehensive unit tests for parameterized repository queries in `backend/tests/unit/postgres.repository.test.ts` and database health check error resilience in `backend/tests/unit/database.health.test.ts`.
  - Updated live HTTP verification suite `backend/scripts/verify-api.ts` to test health check responses in both connected and disconnected scenarios, and verify all 12 API contract checks.
  - Authored thorough persistence and resilience documentation in `evidence/Day-06/persistence-verification.md`.
  - Updated root `README.md` with step-by-step PostgreSQL database creation, environment variable setup, and migration commands.
- **Files / folders changed:**
  - `database/migrations/001_create_service_requests.sql`
  - `backend/package.json`
  - `backend/src/config/environment.ts`
  - `backend/src/database/connection.ts`
  - `backend/src/database/migrate.ts`
  - `backend/src/modules/requests/repository.ts`
  - `backend/src/modules/requests/routes.ts`
  - `backend/src/app.ts`
  - `backend/src/server.ts`
  - `backend/tests/unit/postgres.repository.test.ts`
  - `backend/tests/unit/database.health.test.ts`
  - `backend/scripts/verify-api.ts`
  - `README.md`
  - `evidence/Day-06/persistence-verification.md`
  - `evidence/Day-06/daily-log.md`
- **How I tested it:**
  - Ran `npm run build` in `backend/`: TypeScript compilation passed with zero errors (`tsc`).
  - Ran `npm run lint` in `backend/`: ESLint check passed with zero errors and zero warnings across all TypeScript sources.
  - Ran `npm test` in `backend/`: 12 automated unit tests passed across 3 test suites:
    1. `Database Health and Error Handling`: verified `checkDatabaseHealth()` safely returns `false` without crashing the process when database is unconfigured or unreachable.
    2. `PostgresRequestRepository Parameterized Queries & Mapping`: verified parameterized `INSERT` query execution, status filtering with `SELECT ... WHERE ($1::text IS NULL OR status = $1)`, `findById` retrieval, missing record (`null`) handling, and `updateStatus` timestamp refreshment.
    3. `RequestService Business Logic & State Machine`: verified business invariant enforcement, initial `OPEN` state, lifecycle transitions (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`), and illegal transition rejections.
  - Ran `npm run migrate` in `backend/`: Verified migration discovery of `001_create_service_requests.sql` and explicit descriptive error handling when `DATABASE_URL` is unconfigured.
  - Ran `npm run verify` in `backend/`: Executed automated HTTP API verification suite:
    1. Verified `GET /api/health` returns HTTP `503 Service Unavailable` with `{ status: "error", database: "disconnected" }` when database is unreachable, proving non-crashing graceful degradation.
    2. Verified root `GET /health` mirrors health and database connectivity state.
    3. Verified `GET /api/requests` returns 200 OK with list of service requests.
    4. Verified `POST /api/requests` creates requests with generated UUID and `OPEN` status.
    5. Verified `POST /api/requests` input validation rejects invalid fields with `400 Bad Request`.
    6. Verified `GET /api/requests/:id` fetches request by ID.
    7. Verified `GET /api/requests/:id` with non-existent UUID returns `404 Not Found` with `RESOURCE_NOT_FOUND`.
    8. Verified `GET /api/requests/:id` with invalid UUID format returns `400 Bad Request` with `INVALID_IDENTIFIER`.
    9. Verified `PATCH /api/requests/:id/status` rejects illegal transitions (`OPEN -> RESOLVED`) with `400 Bad Request` and `INVALID_STATUS_TRANSITION`.
    10. Verified `PATCH /api/requests/:id/status` allows valid transition (`OPEN -> IN_PROGRESS`).
    11. Verified `GET /api/requests?status=IN_PROGRESS` returns filtered results.
    12. Verified malformed JSON syntax is caught and returns `400 Bad Request` with `VALIDATION_ERROR`.
- **Evidence links (screenshots, tests, diagrams):**
  - Persistence & Resilience Verification Document: [`evidence/Day-06/persistence-verification.md`](persistence-verification.md)
  - Data Model & Relational Schema: [`docs/data-model.md`](../../docs/data-model.md)
  - Architecture Decision Record: [`docs/decisions/ADR-001-architecture.md`](../../docs/decisions/ADR-001-architecture.md)
  - SQL Migration File: [`database/migrations/001_create_service_requests.sql`](../../database/migrations/001_create_service_requests.sql)
  - Screenshots Directory: [`evidence/Day-06/screenshots/`](screenshots/)
    - `01-database-migration-runner.png`: Terminal output of `npm run migrate` successfully applying `001_create_service_requests.sql` to PostgreSQL
    - `02-postgresql-service-requests-table-schema.png`: Relational schema of `service_requests` table visualized in PostgreSQL table viewer
    - `03-create-request-201-postman.jpg`: Postman verification of `POST /api/requests` returning 201 Created and persisting record into PostgreSQL
    - `04-get-all-requests-200-postman.png`: Postman verification of `GET /api/requests` returning 200 OK with persisted database records
    - `05-get-requests-status-filtered-postman.png`: Postman verification of `GET /api/requests` with status filtering returning 200 OK
    - `er-diagram-illustration.jpg`: Entity-Relationship conceptual architecture illustration
    - `er-diagram.png`: Entity-Relationship diagram for service_requests table
- **Problem encountered:** When migrating timestamp types from PostgreSQL `timestamptz` into domain model `ServiceRequest`, the `pg` driver returned JavaScript `Date` instances rather than ISO 8601 strings. This initially led to type mismatches with the existing `ServiceRequest` contract (`created_at: string`, `updated_at: string`).
- **How I investigated it:** Checked the column mapping function in `PostgresRequestRepository` and inspected the returned object properties against the domain interface.
- **Root cause:** PostgreSQL driver `node-postgres` deserializes `timestamptz` columns as Node.js `Date` objects by default.
- **How I fixed it:** Implemented `mapRowToServiceRequest` helper that conditionally checks `instanceof Date` and invokes `.toISOString()`, ensuring guaranteed ISO 8601 string outputs matching the domain model and REST API contract.
- **What I would improve:** In Day 07, explore database transactions (`BEGIN` / `COMMIT` / `ROLLBACK`) for multi-step database workflows, and integrate automated database migration tracking table (e.g. `schema_migrations`) for versioned forward/rollback migration management.
- **GitHub branch:** `feat/day-06-postgresql-persistence`
- **Pull request:** Created upon branch push to `main`
- **Commit hash:** Recorded in Git commit history for `feat/day-06-postgresql-persistence`
- **Blockers / questions for supervisor:** None.
