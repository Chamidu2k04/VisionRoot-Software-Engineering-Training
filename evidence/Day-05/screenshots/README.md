# Day 05 Backend API Verification Screenshots

This directory contains visual HTTP verification screenshots of the Day 05 Express.js & TypeScript Backend API implementation captured via Postman and web browser:

---

### 1. Health Check Endpoint — Postman (`GET /api/health`)
Verifies HTTP `200 OK` status and health metadata `{ "status": "ok", "service": "service-request-api", "timestamp": "..." }`.
![API Health Check Postman](01-api-health-check-postman.png)

---

### 2. Health Check Endpoint — Browser (`GET /api/health`)
Verifies direct browser access to the health endpoint with formatted JSON output.
![API Health Check Browser](02-api-health-check-browser.png)

---

### 3. Create Service Request — Postman (`POST /api/requests`)
Submits a valid service request (`Sample Request 1`). The service layer authoritatively defaults `status` to `'OPEN'` and generates a UUID and UTC timestamps, returning HTTP `201 Created`.
![Create Request 201 Postman](03-create-request-201-postman.png)

---

### 4. Schema Validation Error — Postman (`POST /api/requests`)
Submits an empty request payload. Zod schema intercepts the request and the centralized error middleware returns HTTP `400 Bad Request` with structured error details (`VALIDATION_ERROR`, missing required fields).
![Create Request Validation Error Postman](04-create-request-validation-error-postman.jpg)

---

### 5. Disallowed Status Transition — Postman (`PATCH /api/requests/:id/status`)
Attempts an illegal direct lifecycle jump from `OPEN` to `CLOSED`. The domain state machine in `RequestService` halts the mutation and returns HTTP `400 Bad Request` with `INVALID_STATUS_TRANSITION` and valid next status guidance (`IN_PROGRESS`).
![Invalid Status Transition Postman](05-invalid-status-transition-postman.png)
