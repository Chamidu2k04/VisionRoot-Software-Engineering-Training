# ADR-001: Adopt a Modular Monolith Architecture with Strict Layered Boundaries

Status: Accepted

## Context
The VisionRoot Trainee Software Engineer program requires delivering a complete, robust, and auditable Service Request Management System within a fast-paced development timeline. The application must support internal staff submitting service requests and operators progressing tickets through a strict, auditable lifecycle workflow (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`).

The engineering goals demand:
1. **Clear Separation of Concerns:** Unambiguous boundaries between UI presentation, HTTP routing/orchestration, business domain workflows, and database persistence.
2. **High Testability:** The ability to execute fast unit tests against business rules and state machines without mocking complex network layers or spinning up distributed clusters.
3. **Operational & Setup Simplicity:** Seamless local developer onboarding, deterministic Docker setups, and single-pipeline cloud deployment without multi-service orchestration overhead.
4. **Data Integrity & Consistency:** Immediate ACID transaction guarantees to prevent inconsistent ticket states or race conditions during status transitions.

## Decision
We choose a **Modular Monolith** architecture consisting of:
- **Presentation Layer:** Next.js (App Router, React Server & Client Components, Tailwind CSS) providing responsive UI, client-side form validation, and typed API communication.
- **Backend Application:** Express.js with TypeScript structured as a modular monolith with strict unidirectional layer dependencies:
  $$\text{Routes \& Controllers} \longrightarrow \text{Validation / Middleware} \longrightarrow \text{Domain Services} \longrightarrow \text{Data Repositories}$$
- **Persistence Layer:** PostgreSQL 16+ serving as the authoritative relational data store with database-level primary keys, check constraints, and B-tree indexes.

Within the backend, domain logic (such as the status transition state machine) resides solely inside `RequestsService`, completely decoupled from Express HTTP objects (`req`, `res`) and database drivers. Database operations are strictly encapsulated inside `RequestsRepository` utilizing parameterized SQL queries.

## Alternatives considered

### 1. Microservices Architecture
- **Description:** Decomposing the system into separate independently deployed services (e.g., Request Creation Service, Status Workflow Service, Reporting Service) communicating via HTTP/gRPC or an asynchronous message broker (Kafka/RabbitMQ).
- **Why Rejected:** 
  - Substantially increases operational complexity (service discovery, network serialization, distributed tracing, multi-repo CI/CD).
  - Introduces distributed data consistency challenges (requires Sagas or two-phase commit instead of simple relational transactions).
  - Unnecessary for the current bounded context and expected internal enterprise traffic volume.

### 2. Next.js Fullstack API Routes / Fat-Controller Architecture
- **Description:** Implementing API endpoints directly inside Next.js Route Handlers (`app/api/...`) or using a traditional Express backend where controllers directly execute database queries and inline business logic.
- **Why Rejected:**
  - Tight coupling between HTTP transport and database logic leads to "fat controllers" that are brittle and difficult to unit test without database mocks.
  - Serverless cold-starts on Next.js API routes complicate connection pooling with relational databases like PostgreSQL.
  - Blurs architectural discipline by allowing database access code to leak into frontend component trees or routing handlers.

## Consequences

### What becomes easier:
- **Isolated Unit Testing:** Business logic and state machine rules can be tested completely in memory with simple mock repositories, resulting in fast and deterministic test suites.
- **Single Deployment Pipeline:** Both backend and frontend deploy as straightforward, single containerized units, eliminating coordination overhead.
- **Immediate Data Consistency:** Native PostgreSQL transactions ensure transitions are atomic and durable without eventual consistency lag.
- **Transparent Debugging:** Requests trace through a single predictable call stack (`Controller` $\rightarrow$ `Service` $\rightarrow$ `Repository`), simplifying root-cause analysis and logging.
- **Future Extensibility:** Domain modules are cleanly isolated; if a future requirement demands extracting a service (e.g. notifications or external reporting), the module boundary is already defined.

### What becomes harder / Trade-offs:
- **Increased Initial Boilerplate:** Creating distinct routes, controllers, services, repositories, schemas, and types for each feature requires more initial files and boilerplate than a simple CRUD script.
- **Shared Scaling Unit:** The entire backend scales as one service. High-volume read traffic (dashboard polling) cannot be scaled independently from write traffic without scaling the entire monolith container instance.

## Review trigger
This decision shall be revisited if:
1. Distinct subdomains (e.g., high-volume automated telemetry ingestion, external third-party webhook integrations, or analytics pipelines) emerge that require independent auto-scaling characteristics.
2. The engineering organization expands into multiple independent teams requiring isolated deployment cadences and decoupled repository ownership.
