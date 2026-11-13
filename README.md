# VisionRoot Software Engineering Training — Service Request Management System

## Repository Metadata

- **Repository URL:** [https://github.com/chamidu2k04/VisionRoot-Software-Engineering-Training](https://github.com/chamidu2k04/VisionRoot-Software-Engineering-Training)
- **Default Branch:** `main`
- **Tech Stack:** Next.js, Express.js, TypeScript, PostgreSQL

---

## Project Overview

The **Service Request Management System** is an internal web application designed for organizational staff to submit, track, filter, view, and update internal service requests (such as IT, Facilities, and Operational requests) through a structured lifecycle.

The system is architected as a modular monolith to maintain clear separation of concerns across presentation, routing, domain logic, and data persistence layers while minimizing deployment overhead. It enforces strict status workflow transitions, thorough server-side validation, clean error responses, and audit-friendly record tracking.

---

## Repository Structure

```text
VisionRoot-Software-Engineering-Training/
├── .github/                   # GitHub workflows, issue templates, and pull request templates
│   └── pull_request_template.md
├── docs/                      # Architectural, requirement, and API specifications
│   ├── requirements.md
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contract.md
│   └── decisions/
│       └── ADR-001-architecture.md
├── frontend/                  # Next.js web client (React, TypeScript, Tailwind CSS)
├── backend/                   # Express.js API server (Node.js, TypeScript)
├── database/                  # PostgreSQL schema definitions, migrations, and seeds
├── tests/                     # Integration, contract, and end-to-end test suites
├── evidence/                  # Daily training progress logs, test outputs, and submission evidence
│   ├── Day-01/
│   │   └── daily-log.md
│   └── Day-02/
│       └── daily-log.md
├── .env.example               # Template for environment variables across services
├── .gitignore                 # Files and directories ignored by Git version control
└── README.md                  # Project overview, repository metadata, and developer documentation
```

### Directory Roles & Responsibilities

- **`docs/`**: Stores baseline software requirements, SDLC guidelines, architecture decision records (ADRs), and API contracts.
- **`frontend/`**: Hosts the Next.js frontend application providing request creation forms, real-time list filtering, and detail views.
- **`backend/`**: Contains the Express.js application organized into routes, controllers, services, and repositories.
- **`database/`**: Houses SQL migrations, seed scripts, and database schema documentation for PostgreSQL.
- **`tests/`**: Contains automated end-to-end and cross-layer integration tests.
- **`evidence/`**: Preserves structured daily logs, test run results, and verification documentation for the VisionRoot training track.

---

## Setup Instructions

> *Note: Detailed setup instructions and step-by-step commands will be finalized once the backend, database, and frontend modules are initialized.*

### Prerequisites

- Node.js (LTS version 20+ recommended)
- npm or pnpm
- PostgreSQL (v15+)
- Git & GitHub Desktop

### Environment Configuration

Copy the example environment file to configure local variables:

```bash
cp .env.example .env
```

Update `.env` with your local PostgreSQL database credentials and server ports.

---

## Running Tests

> *Note: Exact execution commands and test scripts will be configured as testing harnesses (Jest / Vitest / Supertest) are integrated into the respective modules.*

Planned testing commands:
- **Backend Unit & Integration Tests:** `npm run test` (in `backend/`)
- **Frontend Component Tests:** `npm run test` (in `frontend/`)
- **Full Suite Verification:** `npm run test:all`
