# Service Request Management System — Requirements & SDLC Specification

## 1. Problem Statement & Target Users

### 1.1 Problem Statement
In modern organizational operations, internal team members frequently require support for technical equipment, workplace facilities, and operational logistics. Currently, organizations without a centralized ticketing or request management solution rely on ad-hoc communication channels (emails, chat threads, informal verbal requests). This approach leads to:
- Lost or unacknowledged service requests.
- Lack of accountability and transparent status tracking.
- Absence of auditability regarding resolution progress and historical changes.
- Operational bottlenecks for support staff attempting to prioritize urgent versus routine issues.

The **Service Request Management System** addresses this problem by delivering a structured, centralized web platform to register, validate, track, and resolve internal requests with strict workflow constraints and persistence guarantees.

### 1.2 Target Users & Roles
- **Requestor (Internal Staff):** Employees who need assistance (hardware setup, software access, workplace repairs, office supplies). They submit new service requests, view the real-time status of their submissions, and verify resolution details.
- **Operator (Support Staff / Department Lead):** Designated team members (IT support engineers, facilities managers, operations coordinators) responsible for fulfilling requests. They inspect queued tickets, filter by lifecycle state, progress tickets through valid operational stages, and close out resolved requests.

---

## 2. Scope & Prioritized Backlog

### 2.1 MVP Scope (In-Scope)
The Minimum Viable Product (MVP) provides the core foundational capabilities required to submit and lifecycle-manage service requests:

1. **Request Creation:**
   - Title: Required trimmed string, length between 5 and 120 characters.
   - Description: Required text, length between 10 and 2000 characters.
   - Category: Restricted to enum values (`IT`, `Facilities`, `Other`).
   - Priority: Restricted to enum values (`LOW`, `MEDIUM`, `HIGH`).
   - Status: Automatically initialized to `OPEN` upon creation.
   - Timestamps: Server-managed `created_at` and `updated_at` audit fields.
2. **Request Listing & Filtering:**
   - List all persisted service requests ordered predictably (e.g., newest first).
   - Filter requests by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
3. **Request Detail Retrieval:**
   - View complete details of an individual request by unique identifier (`id`).
   - Return structured 404 response for non-existent identifiers.
4. **Strict Status Lifecycle Workflow:**
   - Enforce unidirectional state transitions: `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
   - Explicitly reject invalid or out-of-order transitions with HTTP `400 Bad Request` and descriptive error details.
5. **Robust Server-Side Validation & Error Contract:**
   - All input validation must be executed server-side.
   - Uniform JSON error response format across bad inputs (`400`), invalid transitions (`400`), and missing records (`404`).
6. **Infrastructure & Health:**
   - Health check endpoint (`GET /api/health`) verifying server operational status and database connectivity.
   - PostgreSQL persistence preserving data integrity and schema constraints.

### 2.2 Future Improvements (Out-of-Scope for MVP)
The following capabilities are deferred to post-MVP iterations:
- User authentication, session management, and granular Role-Based Access Control (RBAC) UI.
- File and screenshot attachments for service tickets.
- Automated email and SMS notification hooks on status changes.
- Comment threads and back-and-forth ticket dialogue.
- Service Level Agreement (SLA) timers and reporting analytics dashboards.

---

## 3. Requirements Specification

### 3.1 Functional Requirements (FR)

- **FR-01: Service Request Submission**
  The system must provide an endpoint and user interface allowing users to submit a service request with a title, description, category, and priority. The system assigns an initial status of `OPEN` and generates ISO-8601 timestamps for `created_at` and `updated_at`.

- **FR-02: Server-Side Validation & Error Handling**
  The backend API must validate all payload attributes prior to persistence. Whitespace must be trimmed. If any field fails validation constraints (title length, description length, invalid category/priority enum), the server must reject the request with HTTP `400 Bad Request` and return an error object explaining the violation.

- **FR-03: Request Listing & Status Filtering**
  The system must allow users to retrieve all service requests. The API must support an optional query parameter (`status`) to filter results by valid statuses (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`). When no filter is supplied, all requests are returned.

- **FR-04: Single Request Details Retrieval**
  The system must allow retrieval of complete details for an individual service request by its identifier. If the record does not exist or the identifier format is invalid, the API must return HTTP `404 Not Found`.

- **FR-05: Strict Lifecycle Transition Enforcement**
  The system must allow operators to transition request statuses strictly following the allowed workflow sequence:
  $$\text{OPEN} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{RESOLVED} \longrightarrow \text{CLOSED}$$
  Any attempt to bypass steps (e.g., `OPEN` directly to `RESOLVED`) or revert status backwards (e.g., `RESOLVED` to `OPEN`) must be rejected with HTTP `400 Bad Request`.

- **FR-06: System Health Check**
  The backend must expose a `GET /api/health` endpoint that checks application runtime status and active database connectivity, returning HTTP `200 OK` with JSON status payload when healthy, and HTTP `503 Service Unavailable` if database connectivity is broken.

### 3.2 Non-Functional Requirements (NFR)

- **NFR-01: Modular Monolith Architecture**
  The system must follow a modular monolith architecture with strict layer separation: Presentation (Next.js), API Routing & Controllers (Express.js), Business Domain Services, and Data Access / Repositories. Business logic must not leak into controllers or frontend presentation components.

- **NFR-02: Data Persistence & Integrity**
  All transactional data must be persisted in PostgreSQL. Database columns must enforce constraints (non-null constraints, check constraints or enum types for category, priority, and status, and foreign keys where applicable).

- **NFR-03: Security & Secret Hygiene**
  No sensitive credentials, database passwords, or secret tokens may be hardcoded into source code or committed into Git. All environment-specific variables must be loaded via `.env` files governed by `.gitignore`, using `.env.example` as a template.

- **NFR-04: Responsive & Clear User Interface**
  The user interface must present clear visual states: loading states during async network calls, explicit error banners on failed requests, validation feedback on form fields, and empty states when no records match filter criteria.

---

## 4. User Stories & Acceptance Criteria

### US-01: Create Valid Service Request
- **As a** Requestor (Internal Staff),
- **I want to** submit a new service request with a title, description, category, and priority,
- **So that** support staff can acknowledge and resolve my workplace or technical problem.

#### Acceptance Criteria
- **Given** valid request input:
  - `title`: "Laptop display flickering frequently" (between 5 and 120 chars)
  - `description`: "External monitor flashes black every few minutes after recent OS update." (between 10 and 2000 chars)
  - `category`: "IT"
  - `priority`: "MEDIUM"
- **When** the Requestor submits the form or issues a `POST /api/requests` request,
- **Then** the server responds with HTTP `201 Created`,
- **And** the persisted record contains a generated `id`, status initialized to `"OPEN"`, and accurate `created_at` and `updated_at` timestamps.

---

### US-02: Reject Invalid Request Creation Inputs
- **As a** Requestor or Operator,
- **I want to** receive immediate and descriptive validation errors when input data violates field constraints,
- **So that** incomplete, malformed, or ambiguous requests are not saved into the database.

#### Acceptance Criteria
- **Given** a request payload with invalid data (e.g., `title` with fewer than 5 characters, blank `description`, or invalid `category` such as `"HR"`),
- **When** a user submits the request via `POST /api/requests`,
- **Then** the server returns HTTP `400 Bad Request`,
- **And** the response payload includes a standard JSON error response detailing which field failed and the validation rule violated,
- **And** no record is persisted into the database.

---

### US-03: List All Service Requests
- **As an** Operator or Requestor,
- **I want to** view a list of all submitted service requests,
- **So that** I have full visibility into the organizational request backlog.

#### Acceptance Criteria
- **Given** one or more service requests exist in the database,
- **When** the user accesses the request list page or calls `GET /api/requests`,
- **Then** the server returns HTTP `200 OK` with an array of service request objects,
- **And** each item displays its `id`, `title`, `category`, `priority`, `status`, and `created_at` timestamp.

---

### US-04: Filter Requests by Status
- **As an** Operator,
- **I want to** filter the list of service requests by their current status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`),
- **So that** I can focus specifically on actionable or pending items.

#### Acceptance Criteria
- **Given** requests exist across different lifecycle statuses in the database,
- **When** the user applies a filter for `status=OPEN` (or calls `GET /api/requests?status=OPEN`),
- **Then** the server returns HTTP `200 OK` with only records whose status is `"OPEN"`,
- **And** if no records match the chosen status, an empty array `[]` is returned alongside a clear empty state message in the UI,
- **And** if an invalid status query parameter is passed (e.g., `?status=PENDING`), the server returns HTTP `400 Bad Request`.

---

### US-05: View Details of a Single Request
- **As an** Operator or Requestor,
- **I want to** view the complete details of a specific service request by its ID,
- **So that** I can review the full description, history timestamps, and current state.

#### Acceptance Criteria
- **Given** a service request with ID `123` exists in the database,
- **When** the user navigates to `/requests/123` or calls `GET /api/requests/123`,
- **Then** the server returns HTTP `200 OK` with the complete request object,
- **And** if a request with ID `99999` does not exist,
- **When** the user navigates to `/requests/99999` or calls `GET /api/requests/99999`,
- **Then** the server returns HTTP `404 Not Found` with a message `"Service request not found"`.

---

### US-06: Update Request Status with Strict Workflow
- **As an** Operator,
- **I want to** update the status of a service request following the prescribed lifecycle transitions,
- **So that** the request lifecycle remains consistent, auditable, and uncorrupted.

#### Acceptance Criteria
- **Given** a service request currently in `"OPEN"` status,
- **When** the Operator updates the status to `"IN_PROGRESS"` via `PATCH /api/requests/:id/status`,
- **Then** the server responds with HTTP `200 OK`, updates `status` to `"IN_PROGRESS"`, and updates `updated_at` to the current timestamp.
- **Given** a service request currently in `"OPEN"` status,
- **When** an attempt is made to update the status directly to `"RESOLVED"` or `"CLOSED"`,
- **Then** the server rejects the transition with HTTP `400 Bad Request` and an error indicating that `"OPEN"` can only transition to `"IN_PROGRESS"`.
- **Given** a service request in `"RESOLVED"` status,
- **When** an attempt is made to transition backward to `"OPEN"` or `"IN_PROGRESS"`,
- **Then** the server rejects the transition with HTTP `400 Bad Request`.

---

## 5. Definition of Done (DoD)

A user story or feature increment is considered **Done** only when all of the following conditions are met:

1. **Acceptance Criteria Verified:** All Given/When/Then scenarios defined for the user story pass manual verification and automated test execution.
2. **Layer Boundaries Respected:** Business domain logic is encapsulated in service layers; controllers only handle HTTP orchestration; database interactions are restricted to repository/data access components.
3. **Server-Side Validation:** All payload data and state transitions are strictly validated on the backend regardless of client-side validation.
4. **Automated Testing:** Unit and integration tests are written, passing, and cover happy paths, boundary constraints, and edge-case error conditions.
5. **Documentation Updated:** Requirements specifications, API contracts, and README documentation reflect any architectural or schema adjustments.
6. **Secret & Git Hygiene:** No environment files, credentials, secrets, or temporary debug logs are committed into version control. Pull requests follow the defined repository template.
