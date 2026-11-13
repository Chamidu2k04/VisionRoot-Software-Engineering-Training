# Daily Evidence Record — Day 05

- **Date:** 2026-11-13
- **Day / Topic:** Day 05 — Backend API and Service Layer
- **Objective:** Establish the Express.js + TypeScript modular monolith backend in `backend/`, implement strict layer boundaries (Controller $\rightarrow$ Service $\rightarrow$ Repository), enforce business invariants and state machine transitions in `RequestService`, provide a database-free `InMemoryRequestRepository` for Day 05 testing, and build centralized Zod validation and error handling.
- **What I learned:**
  - How to structure a modular monolith in TypeScript with strict layer boundaries where the Controller is solely responsible for HTTP transport and validation parsing, the Service encapsulates business invariants and state machine logic with zero HTTP awareness, and the Repository isolates persistence.
  - The power of dependency injection via interfaces (`IRequestRepository`), which enables rapid testability and seamless migration from in-memory storage to PostgreSQL in Day 06 with zero changes to domain business logic or HTTP controllers.
  - How to build a centralized Express error handling middleware that captures custom domain errors (`AppError`, `ValidationError`, `NotFoundError`), Zod schema errors, and malformed JSON syntax errors into a uniform, secure JSON error envelope without leaking internal stack traces.
- **What I implemented:**
  - Initialized backend TypeScript configuration with `backend/package.json`, `backend/tsconfig.json`, and `backend/.eslintrc.json`.
  - Created environment configuration module `backend/src/config/environment.ts` with sensible defaults (`PORT=5000`, `NODE_ENV=development`, `CORS_ORIGIN=http://localhost:3000`).
  - Implemented custom error hierarchy in `backend/src/errors/AppError.ts` (`AppError`, `ValidationError` [400], `NotFoundError` [404]) with standardized error codes.
  - Built centralized error middleware in `backend/src/middleware/error-handler.ts` normalizing all validation errors, syntax errors, and domain exceptions into a uniform JSON error envelope while suppressing stack traces.
  - Created strong domain models and constants in `backend/src/modules/requests/types.ts` (`RequestCategory`, `RequestPriority`, `RequestStatus`, `ServiceRequest`, `CreateRequestDTO`, `ALLOWED_STATUS_TRANSITIONS`).
  - Authored Zod validation schemas in `backend/src/modules/requests/schema.ts` for payload creation (with trimmed lengths 5–120 and 10–2000), status filtering, UUID v4 parameter checking, and status update validation.
  - Built `IRequestRepository` interface and `InMemoryRequestRepository` in `backend/src/modules/requests/repository.ts` providing CRUD operations, UUID generation (`node:crypto`), ISO timestamps, and newest-first descending ordering.
  - Built `RequestService` in `backend/src/modules/requests/service.ts` enforcing initial status `'OPEN'`, authoritative lifecycle progression (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`), and throwing domain errors without importing Express.
  - Built `RequestController` in `backend/src/modules/requests/controller.ts` mediating HTTP requests/responses, invoking Zod validation, mapping status codes (`200`, `201`), and delegating errors to `next(error)`.
  - Configured router in `backend/src/modules/requests/routes.ts` mounting `POST /requests`, `GET /requests`, `GET /requests/:id`, `PATCH /requests/:id/status`, and `GET /health`.
  - Assembled Express application in `backend/src/app.ts` with CORS, JSON body parser, request logging, `/api` router, 404 catch-all, and centralized error handling; and created `backend/src/server.ts` entry point.
  - Authored comprehensive unit tests in `backend/tests/unit/requests.service.test.ts` and automated end-to-end API verification suite in `backend/scripts/verify-api.ts`.
  - Authored architectural isolation documentation in `evidence/Day-05/layer-responsibilities.md`.
  - Authored formatted HTTP verification trace evidence in `evidence/Day-05/api-verification.md`.
  - Updated root `README.md` with backend installation, development, testing, and linting instructions.
  - Reviewed and aligned `docs/api-contract.md` with implemented error codes.
- **Files / folders changed:**
  - `backend/package.json`
  - `backend/tsconfig.json`
  - `backend/.eslintrc.json`
  - `backend/src/config/environment.ts`
  - `backend/src/errors/AppError.ts`
  - `backend/src/middleware/error-handler.ts`
  - `backend/src/modules/requests/types.ts`
  - `backend/src/modules/requests/schema.ts`
  - `backend/src/modules/requests/repository.ts`
  - `backend/src/modules/requests/service.ts`
  - `backend/src/modules/requests/controller.ts`
  - `backend/src/modules/requests/routes.ts`
  - `backend/src/app.ts`
  - `backend/src/server.ts`
  - `backend/scripts/verify-api.ts`
  - `backend/tests/unit/requests.service.test.ts`
  - `docs/api-contract.md`
  - `README.md`
  - `evidence/Day-05/layer-responsibilities.md`
  - `evidence/Day-05/api-verification.md`
  - `evidence/Day-05/daily-log.md`
- **How I tested it:**
  - Ran `npm run build` in `backend/`: TypeScript compilation passed with zero errors (`tsc`).
  - Ran `npm run lint` in `backend/`: ESLint check passed cleanly across all TypeScript sources.
  - Ran `npm test` in `backend/`: 7 unit tests passed verifying `RequestService` business invariants, `OPEN` defaults, illegal status transitions (`OPEN -> RESOLVED`, `OPEN -> CLOSED`, transitions from terminal `CLOSED`), valid lifecycle progression, and newest-first sorting.
  - Ran `npm run verify` in `backend/`: Executed 12 automated live HTTP tests across all API endpoints:
    1. `GET /api/health` returned HTTP `200` with `{ status: "ok", service: "service-request-api" }`.
    2. `GET /health` returned HTTP `200` with root health status.
    3. `GET /api/requests` returned HTTP `200` with baseline seed records.
    4. `POST /api/requests` returned HTTP `201` with generated UUID and status `'OPEN'`.
    5. `POST /api/requests` with invalid lengths/enums returned HTTP `400` with `VALIDATION_ERROR`.
    6. `GET /api/requests/:id` returned HTTP `200` with expected entity fields.
    7. `GET /api/requests/:id` with non-existent UUID returned HTTP `404` with `RESOURCE_NOT_FOUND`.
    8. `GET /api/requests/:id` with invalid UUID format returned HTTP `400` with `INVALID_IDENTIFIER`.
    9. `PATCH /api/requests/:id/status` attempting `OPEN` $\rightarrow$ `RESOLVED` returned HTTP `400` with `INVALID_STATUS_TRANSITION`.
    10. `PATCH /api/requests/:id/status` transitioning `OPEN` $\rightarrow$ `IN_PROGRESS` returned HTTP `200` with updated status.
    11. `GET /api/requests?status=IN_PROGRESS` returned HTTP `200` with filtered results.
    12. `POST /api/requests` with malformed JSON syntax returned HTTP `400` with `VALIDATION_ERROR`.
- **Evidence links (screenshots, tests, diagrams):**
  - Layer Responsibilities & Architecture Isolation: [`evidence/Day-05/layer-responsibilities.md`](layer-responsibilities.md)
  - API HTTP Verification Logs & Traces: [`evidence/Day-05/api-verification.md`](api-verification.md)
  - API Screenshots Directory: [`evidence/Day-05/screenshots/`](screenshots/)
    - `01-api-health-check-postman.png`: Postman verification of `GET /api/health` returning 200 OK
    - `02-api-health-check-browser.png`: Browser verification of `GET /api/health` returning 200 OK
    - `03-create-request-201-postman.png`: Postman verification of `POST /api/requests` returning 201 Created with generated UUID and `OPEN` status
    - `04-create-request-validation-error-postman.jpg`: Postman verification of `POST /api/requests` with empty body returning 400 Bad Request and structured `VALIDATION_ERROR` details
    - `05-invalid-status-transition-postman.png`: Postman verification of `PATCH /api/requests/:id/status` attempting `OPEN` $\rightarrow$ `CLOSED` returning 400 Bad Request with `INVALID_STATUS_TRANSITION` guidance
- **Problem encountered:** When running unit tests with an empty array `new InMemoryRequestRepository([])`, the repository constructor checked `initialData.length > 0`, causing default seed records to be populated when empty array was passed.
- **How I investigated it:** Inspected unit test assertion failure where `listRequests('OPEN')` returned 3 records instead of 1.
- **Root cause:** Constructor checked `initialData.length > 0` rather than `initialData !== undefined`, treating `[]` as falsey and falling back to default seed records.
- **How I fixed it:** Updated constructor to `initialData !== undefined ? ... : populateDefaultSeeds()`, allowing explicit passing of `[]` for isolated tests.
- **What I would improve:** In Day 06, implement the PostgreSQL repository (`PostgresRequestRepository`) with connection pooling (`pg`) and SQL migrations, seamlessly substituting `InMemoryRequestRepository`.
- **GitHub branch:** `feat/day-05-backend-api-and-service`
- **Pull request:** Created upon branch push to `main`
- **Commit hash:** Recorded in Git commit history for `feat/day-05-backend-api-and-service`
- **Blockers / questions for supervisor:** None.
