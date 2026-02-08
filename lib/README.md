# lib — Shared Libraries & Helpers

Overview
- Contains shared helpers used by both server and client code.
- Examples: `mongodb.ts` (database connection), API helpers, and small utilities.

Key Files
- `lib/mongodb.ts` — MongoDB client and connection helpers.
- `lib/utils.ts` — General helper functions used across the app.

Best Practices
- Keep functions pure when possible.
- Prefer re-usable small utilities over large monoliths.

---