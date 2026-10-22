# Support Desk

A support-team workspace for submitting, triaging, investigating, and resolving customer issues. The app includes a validated ticket form, a filterable queue, ticket detail pages, and eight synthetic example tickets.

## Setup

This app is part of the pnpm workspace. Use Node.js 24 and pnpm from the workspace root.

1. Install the workspace dependencies with `pnpm install`.
2. Make sure the development PostgreSQL database is available through `DATABASE_URL`.
3. Apply the development schema with `pnpm --filter @workspace/db run push`.
4. Start the configured **API Server** and **Support Desk web** workflows in Replit.

The web artifact uses the workspace proxy to reach the API at `/api`; do not point the browser directly at a local API port. The API seeds eight synthetic tickets the first time the queue is requested when the ticket table is empty. The seed content contains no real customer details, credentials, or private IP addresses.

## Architecture

- **Web app:** React and Vite, with Wouter for routes and TanStack Query for server state.
- **API:** The shared Express API server serves ticket routes under `/api`.
- **Contract and validation:** `lib/api-spec/openapi.yaml` is the API source of truth. Orval generates React Query hooks and Zod request/response schemas.
- **Persistence:** PostgreSQL accessed through Drizzle ORM. The web app calls the API; it does not connect to the database directly.
- **Activity:** Investigation notes, troubleshooting steps, customer updates, and resolutions are stored as ticket activity entries. Adding a resolution also records the resolution on the ticket and changes its status to **Resolved**.

## Data model

### `support_tickets`

Stores the ticket number, title, product area, environment, description, expected and actual behavior, reproduction steps, optional error message and sanitized logs, customer impact, severity, status, owner, resolution, and creation/update timestamps.

Status values are **New**, **Investigating**, **Waiting for Customer**, **Escalated**, **Resolved**, and **Closed**. Severity values are **Critical**, **High**, **Medium**, and **Low**.

### `support_ticket_activity`

Stores a ticket reference, activity kind, note body, author label, and timestamp. Activity kinds are **investigation**, **troubleshooting**, **customer_update**, and **resolution**. Each entry belongs to one ticket and is removed if its ticket is deleted.

## Testing and checks

Run the full TypeScript check from the workspace root:

```bash
pnpm run typecheck
```

Check the API server independently:

```bash
pnpm --filter @workspace/api-server run typecheck
```

With the API workflow running, a quick smoke check can confirm the sample queue and server validation:

```bash
curl -i http://localhost:80/api/tickets
curl -i -X POST http://localhost:80/api/tickets \
  -H 'content-type: application/json' \
  --data '{"title":"x"}'
```

The second request should return **400** with field-specific validation messages. The queue should initially return eight tickets in the empty development database.

## Troubleshooting

- **The queue cannot load:** Confirm the API Server workflow is running and that the web app is using the shared `/api` path.
- **Database connection errors:** Check that `DATABASE_URL` is available to the API Server workflow. Keep database credentials in Replit Secrets; do not put them in source files or logs.
- **Missing-table errors:** Apply the development schema with `pnpm --filter @workspace/db run push`, then restart the API Server workflow.
- **No sample tickets appear:** The examples are inserted only when the ticket table is empty. Existing tickets are left untouched.
- **A submission returns 400:** Read the response message for the specific field and length requirement, then correct the form values.

## Deployment

Publish the Support Desk web artifact through Replit's Publish flow and make sure the shared API Server service is available to it. The API needs `DATABASE_URL` for the production PostgreSQL database. The development command above applies schema changes only to the development database; Replit's Publish flow compares development and production schemas and applies the production change. Review any rename confirmation shown during publishing. Do not run the development schema push against production. Keep sample ticket content synthetic if reseeding a new environment.
