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

## Repository Directory Structure

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
│   └── .env.example           # Frontend environment template
├── backend/                   # Express.js API server (Node.js, TypeScript)
│   └── .env.example           # Backend environment template
├── database/                  # PostgreSQL schema definitions, migrations, and seeds
├── tests/                     # Integration, contract, and end-to-end test suites
├── evidence/                  # Daily training progress logs, test outputs, and submission evidence
│   ├── Day-01/
│   │   └── daily-log.md
│   ├── Day-02/
│   │   └── daily-log.md
│   └── Day-03/
│       └── daily-log.md
├── .editorconfig              # Standardized indentation, character encoding, and line endings
├── .env.example               # Root unified environment variable template
├── .gitignore                 # Files and patterns ignored by Git version control
├── .prettierignore            # Files and directories ignored by Prettier
├── .prettierrc                # Prettier code formatting rules
├── package.json               # Root workspace scripts and developer tooling
└── README.md                  # Project overview, repository metadata, and developer documentation
```

### Directory Roles & Responsibilities

- **`docs/`**: Stores baseline software requirements, SDLC guidelines, architecture decision records (ADRs), and API contracts.
- **`frontend/`**: Hosts the Next.js frontend application providing request creation forms, real-time list filtering, and detail views.
- **`backend/`**: Contains the Express.js application organized into routes, controllers, services, and repositories.
- **`database/`**: Houses SQL migrations, seed scripts, and database schema documentation for PostgreSQL.
- **`tests/`**: Contains automated end-to-end and cross-layer integration tests.
- **`evidence/`**: Preserves structured daily logs, test run results, and verification documentation for the VisionRoot training track.
- **`.github/`**: Houses GitHub issue templates, pull request templates, and workflow automations.

---

## Local Environment Setup

Follow these step-by-step instructions to prepare your local development environment from scratch.

### 1. Prerequisites

Ensure the following tools are installed on your workstation:
- **Node.js**: v20+ LTS ([Download](https://nodejs.org/))
- **npm**: v10+ (bundled with Node.js)
- **PostgreSQL**: v15+ ([Download](https://www.postgresql.org/download/))
- **Git**: v2.40+ & GitHub Desktop ([Download Git](https://git-scm.com/))

### 2. Cloning the Repository

Clone the project and navigate into the root directory:

```bash
git clone https://github.com/chamidu2k04/VisionRoot-Software-Engineering-Training.git
cd VisionRoot-Software-Engineering-Training
```

### 3. Configuring Environment Variables

> [!CAUTION]
> **Secret Hygiene Warning:** Never commit real `.env` or `.env.local` files containing actual passwords or secret keys to version control. All `.env` and `.env.*` files (except `.env.example`) are ignored by `.gitignore`.

Copy the template environment files for backend and frontend:

**Backend Environment:**
```bash
cp backend/.env.example backend/.env
```
*(On Windows PowerShell: `Copy-Item backend/.env.example backend/.env`)*

Open `backend/.env` and update the `DATABASE_URL` with your local PostgreSQL password:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/service_requests_db
```

**Frontend Environment:**
```bash
cp frontend/.env.example frontend/.env.local
```
*(On Windows PowerShell: `Copy-Item frontend/.env.example frontend/.env.local`)*

Open `frontend/.env.local` and confirm the API endpoint:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 4. Database Creation & Migrations

Create the PostgreSQL database using `createdb` (or inside the PostgreSQL shell `psql`):

```bash
# Using PostgreSQL CLI
createdb -U postgres service_requests_db
```
*Or execute within `psql`:*
```sql
CREATE DATABASE service_requests_db;
```

Execute database migrations to initialize tables and indexes:

```bash
cd backend
npm run migrate
cd ..
```

### 5. Running the Application

Open two separate terminal windows or tabs to run the backend and frontend concurrently:

**Terminal 1 — Backend API:**
```bash
cd backend
npm install
npm run dev
```
The backend API server will start on [http://localhost:5000](http://localhost:5000) (API root: `http://localhost:5000/api`).

**Terminal 2 — Frontend UI:**
```bash
cd frontend
npm install
npm run dev
```
The Next.js client will start on [http://localhost:3000](http://localhost:3000).

---

## Code Formatting & Linting

Code formatting standards are enforced across the repository using Prettier and EditorConfig.

Run formatting checks and auto-formatting from the repository root:

```bash
# Check code formatting compliance across files
npm run format:check

# Automatically format all supported code, documentation, and config files
npm run format

# Run linting across modules (once initialized)
npm run lint
```

---

## Git & Contribution Workflow

To maintain code quality, auditability, and clean Git history throughout the VisionRoot training, follow this workflow:

1. **Branching Strategy:**
   - Always branch off the latest `main` branch.
   - Use descriptive branch naming conventions:
     - Features: `feat/day-XX-short-description`
     - Documentation: `docs/day-XX-short-description`
     - Configuration/Tooling: `chore/day-XX-short-description`
     - Fixes: `fix/day-XX-short-description`
2. **Focused Commits:**
   - Commit code in logical, atomic increments.
   - Use conventional commit messages: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
   - Never commit sensitive files, credentials, or transient build outputs (`dist/`, `.next/`, `node_modules/`, `.env*`).
3. **Pull Request & Code Review:**
   - Open a Pull Request targeting `main`.
   - Complete the PR description following the template in [`.github/pull_request_template.md`](file:///.github/pull_request_template.md).
   - Ensure all automated checks (formatting, linting, tests) pass before requesting supervisor review.
4. **Daily Evidence Record:**
   - Log daily progress, technical insights, implementation details, testing results, and blockers under `evidence/Day-XX/daily-log.md`.
