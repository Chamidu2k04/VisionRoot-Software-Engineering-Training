# Full-Stack Integration Bug Log — Day 07

- **Date:** 2026-11-13
- **Day / Topic:** Day 07 — Full-Stack Integration and Business Workflows
- **Branch:** `feat/day-07-fullstack-integration`
- **Component(s) Affected:** `backend/src/app.ts`, `frontend/src/services/requestsApi.ts`, `frontend/src/features/requests/components/RequestDetailsModal.tsx`

---

## Executive Summary

During Day 07 full-stack wiring between the Next.js frontend (`http://localhost:3000`), Express + TypeScript backend (`http://localhost:5000`), and PostgreSQL database, two critical integration bugs were diagnosed and resolved:
1. **CORS Preflight Negotiation Failure on `PATCH` Requests:** Browsers blocked cross-origin status transitions due to unhandled `OPTIONS` preflight requests and implicit method/header whitelists.
2. **Silent Mock Fallback & Error Envelope Masking:** Frontend client intercepted network failures and silently returned mock data, while failing to unwrap the standardized `{ error: { code, message, details } }` envelope for HTTP 400 validation and transition rejections.

Both issues were systematically isolated, rooted, resolved, and verified using automated integration scripts.

---

## Bug #1: CORS Preflight Failure on Cross-Origin `PATCH /api/requests/:id/status`

### 1. Symptom
When a user opened the `RequestDetailsModal` in the Next.js frontend (`http://localhost:3000`) and clicked **"Advance to In Progress"** or **"Close Request"**, the UI displayed a generic `Network error` exception. 
In the browser developer console, the following error was logged:
```text
Access to fetch at 'http://localhost:5000/api/requests/7b594b98-.../status' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Methods' header is present on the requested resource.
```
The request never reached `RequestController.updateStatus`, and the database remained unchanged.

### 2. Diagnosis
1. Inspected browser DevTools **Network** tab:
   - For `GET /api/requests`, requests succeeded because `GET` with standard headers qualifies as a CORS simple request (or standard preflight).
   - For `PATCH /api/requests/:id/status` with `Content-Type: application/json`, the browser automatically issued an HTTP `OPTIONS` preflight request.
2. Inspected `backend/src/app.ts`:
   ```typescript
   // Previous configuration
   app.use(
     cors({
       origin: env.corsOrigin === '*' ? '*' : env.corsOrigin,
       credentials: true,
     })
   );
   ```
3. The Express middleware router did not explicitly register an `OPTIONS` route handler (`app.options('*', ...)`), causing certain preflight requests to fall through to downstream catch-all route handlers without setting `Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS` and `Access-Control-Allow-Headers: Content-Type, Authorization`.

### 3. Root Cause
`PATCH` is not a CORS "simple method" (unlike `GET`, `HEAD`, and standard `POST`). When combined with `Content-Type: application/json`, the browser must receive explicit confirmation from the server during the `OPTIONS` preflight handshake that `PATCH` is permitted on that origin and that `Content-Type` is an allowed request header. Without explicit preflight route registration and method specification, browsers reject the preflight and refuse to dispatch the actual `PATCH` request.

### 4. Fix
In `backend/src/app.ts`, explicitly configured the CORS options and added a preflight catch-all handler:
```typescript
// backend/src/app.ts
const corsOptions: cors.CorsOptions = {
  origin: env.corsOrigin === '*' ? '*' : env.corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
```

### 5. Verification
- Dispatched `OPTIONS /api/requests/:id/status` with `Origin: http://localhost:3000` and `Access-Control-Request-Method: PATCH`: received HTTP `204 No Content` with `Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS`.
- Dispatched `PATCH /api/requests/:id/status` from the browser: successfully reached `RequestController.updateStatus` and returned HTTP `200 OK`.

---

## Bug #2: Automatic Mock Fallback Obscuring Backend Failures & Swallowing Error Envelopes

### 1. Symptom
Two interrelated issues occurred in `frontend/src/services/requestsApi.ts`:
1. When the backend was offline, submitting `CreateRequestForm` still showed a green banner: `Service request #7b594b98 created successfully!`. The user thought the record was created, but it was only saved to an in-memory client array and vanished on page reload.
2. When the backend rejected an invalid status transition (e.g. attempting to jump from `OPEN` directly to `CLOSED`), the modal showed:
   `Request failed with status 400: Bad Request`
   instead of the informative backend business error message:
   `Cannot transition request from 'OPEN' to 'CLOSED'. Valid next status is: 'IN_PROGRESS'`.

### 2. Diagnosis
1. Inspected `frontend/src/services/requestsApi.ts`:
   ```typescript
   // Previous implementation in requestsApi.ts
   } catch (error) {
     if (
       mockFallback &&
       (error instanceof TypeError ||
         (error instanceof Error &&
           (error.message.includes('fetch') ||
             error.message.includes('ECONNREFUSED'))))
     ) {
       console.warn(`[requestsApi] Backend at ${url} unreachable. Using demo fallback mode.`);
       return mockFallback();
     }
     ...
   ```
   Every API method was invoked with a fallback function:
   `() => mockApi.createRequest(payload)`
   Whenever a real network disconnect occurred, `apiFetch` swallowed the error and called `mockApi.createRequest`, generating a synthetic in-memory object and misleading the user.
2. Inspected the error handling logic:
   ```typescript
   if (!res.ok) {
     let errorPayload: ApiErrorPayload | undefined;
     try {
       const errorJson: ApiErrorResponse = await res.json();
       errorPayload = errorJson.error;
     } catch {}

     throw new ApiError(
       res.status,
       errorPayload?.message || `HTTP error ${res.status}: ${res.statusText}`,
       errorPayload
     );
   }
   ```
   If `errorPayload` was extracted, but `CreateRequestForm` and `RequestDetailsModal` were not consistently reading `err.payload?.message`, the UI defaulted to generic HTTP status text.

### 3. Root Cause
- The Day 04 preview mock fallback mechanism was designed for standalone UI evaluation before backend and database existed. When entering Day 07 full-stack integration, automatic mock fallback violated the architectural contract: API failures must propagate transparently to the user interface.
- Frontend components were not robustly reading both `err.payload?.message` and `err.message` from the standardized Express error envelope `{ error: { code, message, details } }`.

### 4. Fix
1. **Removed Automatic Mock Fallback:**
   In `frontend/src/services/requestsApi.ts`, eliminated the `mockFallback` parameter from `apiFetch`. Real network and server errors now throw a typed `ApiError(0, ...)` with actionable troubleshooting text:
   ```typescript
   // frontend/src/services/requestsApi.ts
   async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
     const url = `${API_BASE_URL}${endpoint}`;
     try {
       const res = await fetch(url, { ... });
       if (!res.ok) {
         let errorPayload: ApiErrorPayload | undefined;
         try {
           const errorJson: ApiErrorResponse = await res.json();
           if (errorJson && typeof errorJson === 'object' && errorJson.error) {
             errorPayload = errorJson.error;
           }
         } catch {}
         
         const message =
           errorPayload?.message ||
           `Request failed with status ${res.status}: ${res.statusText || 'Server Error'}`;

         throw new ApiError(res.status, message, errorPayload || {
           code: `HTTP_${res.status}`,
           message,
           details: [],
         });
       }
       return (await res.json()) as T;
     } catch (error) {
       if (error instanceof ApiError) throw error;
       const errorMessage = error instanceof Error && error.message
         ? `Unable to connect to backend API server at ${API_BASE_URL} (${error.message}). Please verify the server is running.`
         : `Network error: Failed to communicate with backend at ${API_BASE_URL}.`;
       throw new ApiError(0, errorMessage, {
         code: 'NETWORK_ERROR',
         message: errorMessage,
         details: [],
       });
     }
   }
   ```

2. **Updated Components to Surface Server Envelopes:**
   - In `CreateRequestForm.tsx`, when `err.payload?.details` has field errors, field-specific validation errors are populated and the top-level error banner displays `err.payload.message || err.message`.
   - In `RequestDetailsModal.tsx`, server rejection messages from `INVALID_STATUS_TRANSITION` (e.g. attempting `OPEN` $\rightarrow$ `CLOSED`) are unwrapped and presented cleanly in the alert banner:
     `setTransitionError(err.payload?.message || err.message)`

### 5. Verification
1. **Offline Test:** Stopped the backend server.
   - Submitting `CreateRequestForm` immediately surfaced a red alert banner: `Submission failed: Unable to connect to backend API server at http://localhost:5000/api...`. No false success message was shown, and the list was not polluted.
   - `RequestList` displayed the dedicated retryable error state with the **Retry** button.
2. **Invalid Transition Test:**
   - Attempted `PATCH /api/requests/:id/status` with `status: "CLOSED"` on an `OPEN` ticket.
   - Backend rejected the request with HTTP `400 Bad Request` and envelope:
     ```json
     {
       "error": {
         "code": "INVALID_STATUS_TRANSITION",
         "message": "Cannot transition request from 'OPEN' to 'CLOSED'. Valid next status is: 'IN_PROGRESS'",
         "details": [
           {
             "current_status": "OPEN",
             "attempted_status": "CLOSED",
             "allowed_next_statuses": ["IN_PROGRESS"]
           }
         ]
       }
     }
     ```
   - Modal immediately displayed the red banner:
     `Backend Error: Cannot transition request from 'OPEN' to 'CLOSED'. Valid next status is: 'IN_PROGRESS'`.
   - Ticket status remained `OPEN` and was not corrupted.

---

## Architectural Lessons & Best Practices
1. **Fail-Fast Over Silent Degradation:** In development and full-stack environments, silent mock fallbacks mask integration defects. Network failures must fail loudly with descriptive troubleshooting context.
2. **Standardized Error Envelopes:** Consistency between backend middleware (`StandardErrorResponse`) and frontend API clients (`ApiErrorPayload`) ensures users receive meaningful validation and business rule messages instead of opaque HTTP status numbers.
3. **Explicit CORS Declarations:** Always define allowed HTTP methods (`PATCH`, `OPTIONS`, etc.) and allowed headers explicitly when handling non-simple REST methods in cross-origin environments.
