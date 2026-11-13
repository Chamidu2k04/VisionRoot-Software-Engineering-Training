# Day 04 Architecture & Design Notes — Frontend Architecture and UI

## 1. Architectural Component Boundaries & Separation of Concerns

The frontend application is structured using Next.js App Router with a modular, feature-based hierarchy designed for scalability, maintainability, and testability.

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css                # Global Tailwind CSS directives & root variables
│   │   ├── layout.tsx                 # Root HTML shell, metadata, and global layout wrappers
│   │   └── page.tsx                   # Main dashboard view orchestrating feature components
│   ├── features/
│   │   └── requests/
│   │       └── components/
│   │           ├── CreateRequestForm.tsx     # Accessible request creation form with client validation
│   │           ├── RequestList.tsx           # Request listing with status filtering, badges, & states
│   │           └── RequestDetailsModal.tsx   # Detailed modal with state-machine transition controls
│   ├── services/
│   │   └── requestsApi.ts             # Dedicated API client abstraction layer (fetch wrapper + mock fallback)
│   └── types/
│       └── request.ts                 # Authoritative TypeScript interfaces & enums from api-contract.md
├── package.json                       # Next.js, React, Tailwind CSS dependencies & scripts
├── tsconfig.json                      # Path aliases (@/*) and TypeScript configuration
├── tailwind.config.ts                 # Tailwind utility styling theme definitions
└── postcss.config.mjs                 # PostCSS setup with Autoprefixer
```

### Why Boundaries Are Strictly Enforced:
1. **Separation of Presentation and Data Access (`page.tsx` vs. `requestsApi.ts`):**
   - Direct `fetch` calls are forbidden inside React components. All network communication is centralized within `requestsApi.ts`.
   - This decouples UI presentation from transport details (base URLs, HTTP methods, headers, serializing, deserializing, error payload wrapping).
   - If the backend protocol changes, headers update, authentication tokens are added, or mock mode is enabled, only `requestsApi.ts` requires modification—components remain untouched.

2. **Feature Components vs. Page Orchestration:**
   - `page.tsx` acts as the orchestrator/container: it manages shared state (`requests`, `isLoading`, `error`, `selectedStatus`, `selectedRequest`), handles initial data fetching on mount and filter change, and synchronizes state when requests are created or updated.
   - `CreateRequestForm.tsx` is an isolated presentation unit: it owns its own local form inputs, dirty states, and inline validation errors, notifying the parent via `onRequestCreated` once creation succeeds.
   - `RequestList.tsx` is a pure presenter: given an array of items and current UI state flags, it renders badges, timestamps, cards, and handles filter clicks without directly knowing how data is fetched.
   - `RequestDetailsModal.tsx` handles isolated inspection and status transition workflows without cluttering the main list layout.

---

## 2. Comprehensive Handling of UI States

Modern web applications must provide feedback across every phase of asynchronous lifecycle operations. The Day 04 UI explicitly accounts for all 4 primary UI states:

### 1. Loading State
- **Implementation:** During initial mount or status filter switching, `isLoading` is set to `true`.
- **UI Behavior:** Rather than a jarring blank screen or basic spinner, `RequestList.tsx` renders animated skeleton card placeholders mimicking the layout of request cards.
- **Button Loading Feedback:** When submitting `CreateRequestForm` or clicking status advance in `RequestDetailsModal`, action buttons disable and render an animated SVG spinner with text (`Submitting Request...`, `Updating...`) to prevent duplicate form submissions.

### 2. Empty State
- **Implementation:** When `requests.length === 0`, `isLoading === false`, and `error === null`.
- **UI Behavior:** A centered, dashed-border empty panel is displayed with a document icon and context-aware messaging:
  - If viewing "All Requests", the user is prompted to submit their first ticket using the adjacent creation form.
  - If a status filter is active (e.g. `CLOSED`), the empty message informs the user that no tickets currently match that specific filter.

### 3. Client Validation Error State
- **Implementation:** Field-level errors (`errors.title`, `errors.description`, `errors.category`, `errors.priority`) are evaluated before any network call.
- **UI Behavior:** Invalid fields receive red borders (`border-rose-400`), subtle rose backgrounds, and inline warning text with `aria-describedby` links. Character counters turn visibly actionable, giving immediate feedback as users type.

### 4. API & Network Error State
- **Implementation:** When an API request rejects or returns an HTTP 4xx/5xx status, `ApiError` is caught and translated.
- **UI Behavior:**
  - **In `RequestList.tsx`:** Renders a prominent recoverable alert banner with an error icon, descriptive message, and an interactive **"Retry"** button that re-triggers `fetchRequests()`.
  - **In `CreateRequestForm.tsx` & `RequestDetailsModal.tsx`:** Renders dismissible alert banners (`role="alert"`) highlighting the server error message (such as `INVALID_STATE_TRANSITION` or backend validation rejections).

---

## 3. Client-Side Validation vs. Authoritative Server-Side Validation

A core tenet of production web engineering is that **client-side validation and server-side validation serve two fundamentally different purposes:**

| Dimension | Client-Side Validation (Frontend) | Server-Side Validation (Backend) |
| :--- | :--- | :--- |
| **Primary Goal** | **User Experience (UX) & Responsiveness:** Instant feedback, fast correction loop, saves unnecessary network roundtrips. | **Security, Correctness & Data Integrity:** Authoritative barrier protecting database and business logic from corruption or malicious payloads. |
| **Authority** | **Non-authoritative:** Can be bypassed via curl, Postman, browser dev tools, or script bots. Never trusted by the database. | **Authoritative & Mandatory:** Enforces database constraints, enum checks, and domain invariants regardless of client origin. |
| **Execution Point**| Evaluated in `CreateRequestForm.tsx` on `onSubmit` and cleared in `onChange` before dispatching HTTP request. | Evaluated in Express middleware/controller using schema validation (e.g. Zod/Joi) before reaching domain services. |
| **Error Handling** | Displays inline field errors beneath corresponding inputs for immediate user remediation. | Returns standard `VALIDATION_ERROR` (HTTP 400) JSON envelope mapped back to field keys by `requestsApi.ts`. |

### Complementary Harmony:
- The frontend enforces title length (5–120 characters after trimming) and description length (10–2000 characters after trimming) to ensure the user receives immediate visual guidance.
- When the backend receives a request, it independently trims and re-validates every field against the API contract.
- If the backend returns validation errors, `requestsApi.ts` parses the `details` array, allowing `CreateRequestForm.tsx` to display server-rejected field issues cleanly even if a client-side check were missed.

---

## 4. Visual UI Verification Screenshots

The following verified screenshots under `evidence/Day-04/screenshots/` document the implemented UI states:

| Screenshot | Description | File |
| :--- | :--- | :--- |
| **01: Pristine Form** | Accessible request submission form with category & priority selectors | [`01-create-request-form.png`](screenshots/01-create-request-form.png) |
| **02: Validation Errors** | Immediate inline validation error messages and character counter warnings | [`02-create-request-validation-errors.png`](screenshots/02-create-request-validation-errors.png) |
| **03: Service Requests List** | Clean card view showing ticket titles, descriptions, and category/priority/status badges | [`03-service-requests-list.png`](screenshots/03-service-requests-list.png) |
| **04: Empty Filter State** | Context-sensitive empty state shown when no tickets match an active filter | [`04-empty-state-filter.png`](screenshots/04-empty-state-filter.png) |

