# Developer Guide — Some Common Changes

## Purpose
- Provides a single, structured handbook that helps any developer make common changes, debug, or extend the system quickly and safely.
- Each section points to the exact files to edit, the expected runtime effect, and verification steps.

## How to use this guide
- Scan the "Quick lookup" for immediate file locations for the task you care about.
- Follow the step-by-step workflow under each task. The workflows explain how changes propagate (UI → API → sync → mailer → exports).

## Contents
- Quick lookup (file map)
- System architecture & data flow
- Detailed workflows for common tasks
  - Forms & validation
  - UI rendering and components
  - Submission API & persistence
  - Mailer templates
  - Sync to Google Sheets & DMZ
  - Payments & payment verification
  - Files / uploads
  - Admin editing
  - Backups & deployments
- Testing, debugging, and verification
- PR checklist and release notes

## QUICK LOOKUP — where to start (file map)
- Forms (single source of truth): `app/utils/forms/schema.ts`
- Form helpers: `app/utils/forms/generateDefaultValues.ts`, `app/utils/forms/getEmail.ts`
- Dynamic form rendering: `app/components/dashboard/form/DynamicForm.tsx`, `app/components/dashboard/form/PopoverForm.tsx`
- Admin form editors: `app/admin/edit-form-dialog.tsx`, `app/admin/edit-user-advanced-dialog.tsx`
- Submission endpoints: `app/api/form/saveForm/route.ts`, `app/api/form/*`
- Payments: `app/api/payments/*`, `app/utils/mailer/PaymentEmail.ts`, `app/api/payments/verify/route.ts`
- Mailers & templates: `app/utils/mailer/*`, `templates/` folder
- Sheets sync & incremental sync: `app/utils/sheets-event-sync.ts`, `app/utils/incremental-sync.ts`, `app/api/sync/*`
- DB connection: `lib/mongodb.ts`
- Utilities: `utils/` (audit-logger, dmz-api, encryption, GetUpdateUser)
- Scripts & ops: `scripts/` and `documentation/`

## SYSTEM ARCHITECTURE & DATA FLOW (brief)
- User-facing UI (Next.js App) renders dynamic forms derived from `eventSchema` in `schema.ts`.
- When a form is submitted the client POSTs to `/api/form/saveForm` which:
  1. Validates payload (server-side) against Zod schemas.
  2. Persists to MongoDB (via `lib/mongodb.ts`).
  3. Triggers `sheets-event-sync` and/or `incremental-sync` for exports.
  4. Sends confirmation emails via `app/utils/mailer/*` and may queue payment flows.

## DETAILED WORKFLOWS

1) Forms & validation (most common)
- Source of truth: `app/utils/forms/schema.ts` contains Zod schemas and `meta` used by UI.
- Drafts: Many pages include a `draft` schema that keeps fields optional to allow saving; do not change drafts unless you intend to change draft behavior.

Change a field (example: make `coach.phone` required)
1. Edit `app/utils/forms/schema.ts` — update `coachFields` Zod schema (remove `.optional()` or add `.min` / `.refine`).
2. Update `coachFieldsMeta` labels/placeholders if needed.
3. Update `generateDefaultValues.ts` to include defaults for the new required fields.
4. Run `npm run dev` and test the UI flow.
5. Confirm server-side validation by inspecting `/api/form/saveForm` responses.
6. Update mailers and sync modules (`app/utils/mailer/*`, `app/utils/sheets-event-sync.ts`) if they assume optional fields.

Files to check after changes
- `app/components/dashboard/form/DynamicForm.tsx`, `PopoverForm.tsx` — UI rendering & client validation
- `app/admin/edit-form-dialog.tsx` — admin edits
- `app/api/form/saveForm/route.ts` — server validation and persistence
- `app/utils/sheets-event-sync.ts`, `app/utils/incremental-sync.ts` — exports
- `app/utils/mailer/*` and `templates/` — emails

2) UI rendering and components
- `DynamicForm.tsx` reads `formMeta` metadata and renders inputs. For custom input types (file uploads, selects with specific options), implement custom renderers in `components/ui/` and update the component switch.

3) Submission API & persistence
- Entry points: `app/api/form/saveForm/route.ts`, `app/api/form/*`.
- These routes call `GetUpdateUser` utilities and `lib/mongodb.ts` to persist records.
- Ensure any new field is serializable (no File objects) — file uploads are handled separately via `api/photos`.

4) Mailer templates
- Templates live in `templates/` and mailer wrappers in `app/utils/mailer/*`.
- When fields become required you can rely on presence in templates; otherwise use `|| ''` fallbacks to avoid template errors.

5) Sync to Google Sheets & DMZ
- Primary modules: `app/utils/sheets-event-sync.ts`, `app/utils/incremental-sync.ts`, and routes under `app/api/sync/*`.
- These modules build rows by mapping `formData.fields` to a header array. If you add fields, update headers and mapping functions accordingly.

6) Payments & verification
- Payment submission: `app/api/payments/submit/route.ts` (rate-limited, CORS-protected).
- Verification: `app/api/payments/verify/route.ts` and mailers in `app/utils/mailer/PaymentConfirmedEmail.ts`.
- Test payments in a dev environment with mocked providers or staging keys.

7) Files / uploads
- Upload handling and storage: check `api/photos/` endpoints and how uploads are stored. The mailer and DB may store references to files (URLs or GridFS ids).

8) Admin editing
- Admin UI uses the same `formMeta` to render edit dialogs. `app/admin/edit-form-dialog.tsx` maps initial fields to local state — ensure defaults satisfy new validation.

9) Backups & deployments
- Scripts: `scripts/backup.sh`, `scripts/deploy.sh`, `scripts/setup-backup.sh`.
- Operational docs are in `documentation/BACKUP_RESTORE_SYSTEM.md` and `admin-docs/ADMIN_PORTAL_SETUP.md`.

TESTING, DEBUGGING & VERIFICATION
- Local dev:
```bash
cd scripts && ./setup-local.sh
npm run dev
```
- Check API requests in browser network tab; inspect server console logs and Sentry.
- Mailer: in dev, mailers usually log to console or use a test transport — check `app/utils/mailer/*` for behavior.
- To test sync logic, call the relevant `/api/sync/*` route with a test payload.

## PR CHECKLIST (before merging)
- Make small, focused changes and include tests when possible.
- Update `schema.ts` first (source of truth), then UI and server.
- Verify local run: `npm run dev`, submit a full registration, confirm DB record, mail, and sync.
- Update `templates/` and `documentation/` if behavior or CSV columns changed.
- Run linter: `npm run lint` and type-check: `npm run build`.

## RELEASE NOTES / CHANGELOG
- Add a short entry in the PR describing:
  - Files changed and why
  - Backwards-incompatible changes (e.g., making previously optional fields required)
  - Migration steps (if any) for existing data