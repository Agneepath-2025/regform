# app folder — Next.js Application (UI)

## Overview
- This folder contains the Next.js app (app/ directory) used for public-facing pages, admin dashboards, and authenticated flows.
- Built with Next.js App Router (for server components), TypeScript, Tailwind CSS, and Sentry.
- It contains all files and folders nessecary for request handling, rendering behavior, and form flows.

## Structure:
### Top-level files (what they do)
- `layout.tsx` — Root layout for the app. Provides the top-level HTML structure, providers (theme, session), and global components included on every page.
- `page.tsx` — The public home/landing page. Entry point for the app route `/`.
- `global-error.tsx` — Global error boundary for server and client exceptions displayed inside the app router.
- `globals.css` — Global CSS file included by the app; contains Tailwind base styles and global overrides.

### Primary route groups and files (detailed)
- `(authentication)/` — All authentication-related flows and pages.
  - `SignIn/`, `SignUp/`, `Verification/`, `enter-phone-number/` — Pages and components for sign in with Google, phone verification, OTP flows, and account creation. These pages integrate with `auth.ts`, `api/auth/*`, and phone verification endpoints.

- `admin/` — Admin portal UI and editing dialogs.
  - `page.tsx` — Admin entry page (dashboard) that lists forms, registrations and quick-actions.
  - `session-provider.tsx` — Server/client bridge that provides admin session context used across admin pages.
  - `edit-form-*.tsx`, `edit-user-*.tsx` — Dialog components used to edit forms, users and payment records. They reuse the `form` schema metadata for rendering and validation.

- `dashboard/` — Organizer dashboards (registrations, payments, reports) exposed to authenticated users.
  - `regForm/` — Registration detail pages and the dynamic form rendering route (`[form]/page.tsx`) which imports `eventSchema` from `app/utils/forms/schema.ts` to render and validate the registration form for each sport.
  - `Payments/` — Payment listing and payment submission helper UI.

- `sentry-example-page/` — Minimal page used to test Sentry integration and error reporting behavior.

### App utilities (important files & where they live)
- `app/utils/forms/schema.ts` — Single source of truth for all form validation and rendering metadata. Exports `eventSchema`, `playerFields`, `coachFields`, and `formMeta`. Edit here when adding/removing fields or changing validation rules.
- `app/utils/forms/generateDefaultValues.ts` — Returns initial values for dynamic forms. Keep in sync with `schema.ts`.
- `app/utils/sheets-event-sync.ts` & `app/utils/incremental-sync.ts` — Logic that formats and sends registration/payment data to Google Sheets and incremental sync endpoints. Update these if you add new exported columns.
- `app/utils/mailer/*` — Email generation wrappers used for registration confirmation and payment emails. Templates live in `templates/` and are rendered here.
- `app/utils/encryption.ts` — Helper for encrypting/decrypting tokens and cookies used across server and API routes.
- `app/utils/GetUpdateUser.ts` — Helpers for fetching and updating user records in MongoDB.

## Components & UI
- The repo splits component ownership between `components/` (root-level shared basic small components) and local components under `app/components` (page-specific forms/dashboards/etc...). 
Key UI form renderers:
  - `app/components/dashboard/form/DynamicForm.tsx` — Renders the dynamic form pages using `formMeta` and performs client-side validation using Zod rules.
  - `app/components/dashboard/form/PopoverForm.tsx` — Compact editor UI used in dashboards.

## API and integration points
- Client pages call the server endpoints under root `api/` (e.g., `/api/form/saveForm`, `/api/payments/submit`, `/api/sync/*`). Server endpoints perform server-side validation and persistence, then call sync/mail functions.

## Common developer workflows inside `app/`
- Changing form fields: update `app/utils/forms/schema.ts` → update `generateDefaultValues.ts` → update `DynamicForm.tsx` 
if custom renderer needed → update `app/api/form/saveForm/route.ts` and `sheets-event-sync.ts` 
for export columns → update mail templates in `templates/`.
- Adding a page: add a new route under `app/` with `page.tsx` and optionally `layout.tsx` for nested route grouping. Use `use client` when you need client-side interactivity.

## Debugging & verification
- Run the dev server and exercise the particular flow. For forms, inspect the network `POST /api/form/saveForm` request and server response. Check Sentry for exceptions and `scripts/db:*` for local DB lifecycle when reproducing issues.
Note: Local Start - See root `README.md` and `documentation/LOCAL_DEVELOPMENT.md` for local setup.


## Where to go next
- Start by reading `app/utils/forms/schema.ts` for registration changes and `app/components/dashboard/form/DynamicForm.tsx` for rendering. The `DEVELOPER_GUIDE.md` at project root contains task-oriented walkthroughs and checklists.

---