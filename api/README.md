# api — Serverless API Endpoints

Overview
- This folder contains the server API endpoints used by the Next.js app and third-party integrations.
- Routes are organized by feature (e.g., `auth/`, `form/`, `payments/`, `sync/`, `photos/`).

Important Routes
- `api/auth/` — Sign-in, session, token handling, and verification.
- `api/form/` — Create/update registrations, public form endpoints.
- `api/payments/` — Payment webhooks and verification flows.
- `api/sync/` — Background syncs (to Google Sheets, DMZ, etc.).
- `api/health/` — Health checks and basic status endpoints.

Auth & Security
- Many endpoints require admin-level authentication; check `middleware.ts` and `middleware-admin.ts`.
- Sensitive operations are protected and audited (`utils/audit-logger.ts`).

Testing & Local Development
- Use the dev server (`npm run dev`) which serves API routes under `/api/`.
- Use tools like `curl` or Postman to exercise endpoints.

Links & References
- Payment webhook setup: `documentation/PAYMENT_VERIFICATION_SETUP.md`
- Google Apps Script webhook: `documentation/GOOGLE_APPS_SCRIPT_WEBHOOK.md`

---
*This README offers a quick map for backend endpoints.*