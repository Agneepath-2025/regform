# app/dashboard — Organizer Dashboard

Overview
- Contains the organizer dashboard pages for viewing registrations, payments, and reports.

Key files
- `page.tsx` — Dashboard landing and listing of forms/registrations.
- `Accomodation/`, `Payments/`, `regForm/` — Sub-pages for specialized flows.

Notes
- Many pages fetch server-side data via internal API endpoints (`/api/form`, `/api/payments`).
- Check `utils/audit-logger.ts` for changes that require audit logs.

---
*Use this README to find dashboard-specific pages quickly.*