# Day 04 UI Screenshots

This directory contains visual verification screenshots of the Day 04 Frontend UI implementation:

### 1. Create Request Form (Pristine State)
Initial form layout showing required indicators, accessible placeholder text, category/priority selectors, and character limit indicators.
![Create Request Form](01-create-request-form.png)

### 2. Form Client-Side Validation Errors
Instant inline validation feedback highlighting required fields when submitted empty or failing character constraints (title: 5–120 chars, description: 10–2000 chars).
![Create Request Validation Errors](02-create-request-validation-errors.png)

### 3. Service Requests List (All Requests)
List view displaying persisted service request cards with identifiers, titles, descriptions, category badges, priority badges, lifecycle status badges, and formatted timestamps.
![Service Requests List](03-service-requests-list.png)

### 4. Status Filter & Empty State
Context-aware empty state presentation displayed when filtering by a status (e.g. "OPEN") with no matching records.
![Empty State Filter](04-empty-state-filter.png)
