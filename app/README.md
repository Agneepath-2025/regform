# app — Next.js Application (UI)

Overview
- This folder contains the Next.js app (app/ directory) used for public-facing pages, admin dashboards, and authenticated flows.
- Built with Next.js App Router (server components), TypeScript, Tailwind CSS, and Sentry.

Structure
- `app/` — Application entry; layout, global error handling, and route groups.
  - `(authentication)/` — Sign-in, sign-up, verification flows.
  - `admin/` — Admin UI and dialogs for editing forms and users.
  - `dashboard/` — Organizer dashboards and registration views.
  - `global-error.tsx`, `layout.tsx`, `page.tsx` — App-level components.

Key Concepts
- Server / Client boundaries: Use "use client" for client-side components.
- Authentication: OAuth + phone verification flow under `(authentication)`; session is handled with server-side and client-side providers.
- API calls: Use endpoints in `api/` (root-level) via fetch or client wrappers in `lib/`.

Env & Local Start
- See root `README.md` and `documentation/LOCAL_DEVELOPMENT.md` for full local setup.
- Dev server: `npm run dev` (or `pnpm dev`, `yarn dev`).

Troubleshooting & Links
- Sentry: `sentry.edge.config.ts`, `sentry.server.config.ts` for setup.
- Styling: `tailwind.config.ts` and `app/globals.css`.
- Tests & linting: `npm run lint` / `npm run test` (if available).

Where to look next
- `components/` for UI building blocks
- `hooks/` for shared React hooks
- `api/` for backend endpoints

---

# add details