# utils — Server Utilities

Overview
- Utility functions used by server code (API routes, background jobs, scripts).

Important utilities
- `audit-logger.ts` — Audit logging for important operations
- `dmz-api.ts` — Integration helpers for DMZ/third-party syncs
- `encryption.ts` — Helpers for encrypting sensitive data
- `GetUpdateUser.ts` — User lookup / update helpers

When to update
- Add tests when changing critical logic (payments, audit logs, encryption).

---
*Server-side utility library documentation.*