# app/admin — Admin UI

Overview
- Admin portal UI for managing forms, payments, and users.
- Key pages include `dashboard.tsx`, editing dialogs (`edit-form-*.tsx`, `edit-user-*.tsx`), and auth flows.

Key files
- `login/` — Admin sign-in UI
- `session-provider.tsx` — Admin session handling
- `theme-provider.tsx` — Theme / appearance for admin portal

Security
- Admin middleware: `middleware-admin.ts` protects admin routes.
- Audit logging: Use `utils/audit-logger.ts` for important actions.

---