# RegForm - Event Registration System

## Manages Registration data for Agneepath (Ashoka's Sports Fest) : 

A repository hosting code for Ashoka University's Premiere Sporting event; Agneepath. It holds the dashboard, form creation, making payments and other aspects of the registration process. It handles OAuth authentication for users, Google sheets Integration to display data and has automated backups for said data.

## Quick Start

### Local Development
```bash
cd scripts && ./setup-local.sh
```

### Production Deployment
```bash
cd scripts && ./deploy.sh
```

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scripts

All automation scripts are in [`scripts/`](./scripts/):

| Script | Purpose |
|--------|---------|
| `setup-local.sh` | Local development environment setup |
| `deploy.sh` | Production deployment automation |
| `backup.sh` | Automated backup (MongoDB + files) |
| `restore.sh` | Interactive backup restoration |
| `setup-backup.sh` | One-time backup automation setup |

**Quick start:** See [`scripts/README.md`](./scripts/README.md)

---


## Repository overview (Folder Subdivision)

The Project is divived into multiple folders that each work on specific components of the Website. The list is given Below:

| Area | Purpose |
|------|---------|
| `app/` | Front-end (Next.js App Router) — see [`app/README.md`](./app/README.md) |
| `app/(authentication)/` | Authentication flows — see [`app/(authentication)/README.md`](./app/(authentication)/README.md) |
| `app/admin/` & `admin/` | Admin UI & admin docs — see [`app/admin/README.md`](./app/admin/README.md) and [`admin/README.md`](./admin/README.md) |
| `app/dashboard/` & `dashboard/` | Organizer dashboards — see [`app/dashboard/README.md`](./app/dashboard/README.md) and [`dashboard/README.md`](./dashboard/README.md) |
| `api/` | Server endpoints and webhooks — see [`api/README.md`](./api/README.md) |
| `components/` | Reusable UI components — see [`components/README.md`](./components/README.md) |
| `lib/`, `utils/` | Shared helpers & server utilities — see [`lib/README.md`](./lib/README.md) and [`utils/README.md`](./utils/README.md) |
| `hooks/` | Shared React hooks — see [`hooks/README.md`](./hooks/README.md) |
| `templates/` | Email/HTML templates used by Mailer — see [`templates/README.md`](./templates/README.md) |
| `public/` | Static assets (images, documents) — see [`public/README.md`](./public/README.md) |
| `scripts/` | Deploy/backup scripts — see [`scripts/README.md`](./scripts/README.md) |
| `documentation/` | Operational guides for backups, webhooks, and local dev — see [`documentation/README.md`](./documentation/README.md) |

> Tip: Start with `scripts/setup-local.sh` to get a reproducible local environment, then open the `app/README.md` and `api/README.md` to learn the core app flows. Read the folder wokflows as you work on the respective folders.

## Top-level files (exact purpose)
Below are the repository files that live at the project root and their exact responsibilities. These are not guesses — they map to code or scripts used by the app.

- `auth.ts` — NextAuth configuration for admin authentication. Defines providers (Google), session strategy (JWT), and sign-in whitelist (`NEXTAUTH_ADMIN_EMAILS`). Used by admin routes and `middleware`/`middleware-admin`.
- `components.json` — Metadata file (used by the project or tooling) that lists component configuration or registry. Update when adding or refactoring global UI components if tooling reads it.
- `docker-compose.dev.yml` — Docker Compose environment configuration for local development services (MongoDB container used by `scripts/setup-local.sh` and `package.json` `db:*` scripts).
- `eslint.config.mjs` — Central ESLint configuration used by `npm run lint` and CI.
- `global.d.ts` — TypeScript global declarations for the project (project-level ambient types).
- `instrumentation-client.ts` — Client-side instrumentation bootstrap (initializes Sentry or other client telemetry for browser/runtime edge usage).
- `instrumentation.ts` — Server initialization hook loaded by Next.js app server; runs one-time startup tasks (initial Google Sheets sync if enabled) and wires server Sentry config.
- `middleware.ts` — Application middleware protecting routes and enforcing auth, rate-limiting for most `/api/*` endpoints, and redirect behavior for sign-in/dashboard flows. Uses JWT cookie validation and `auth` for admin paths.
- `middleware-admin.ts` — Admin-focused middleware wrapper that ensures only authenticated admin sessions can reach `/admin/*` routes (alternate auth entrypoint used in some deployments).
- `middleware-init.ts` — Lightweight middleware used to trigger server initialization (imports `app/server-init`) and match most request paths (excludes Next static/ image routes). Useful for one-time side-effects on server start.
- `next/` — Next.js internal configuration folder created by framework (contains built artifacts for app router in some environments). Do not modify unless you know Next internals.
- `next-env.d.ts` — TypeScript ambient definitions that Next.js requires.
- `next.config.ts` — Next.js configuration (security headers, Sentry integration via `withSentryConfig`, bundler options, and tunnel route for Sentry).
- `next-env.d.ts` — TypeScript Next environment types (auto-generated by Next.js).
- `number-to-words.d.ts` — Local TypeScript declaration for the `number-to-words` module usage.
- `package.json` — Project scripts and dependency list. Scripts include dev, build, start, docker helpers, and database helper commands referenced in `scripts/setup-local.sh`.
- `postcss.config.mjs` — PostCSS configuration (TailwindCSS + plugins) used in builds.
- `sentry.edge.config.ts` — Sentry configuration for Edge runtime (client/edge instrumentation); used when the app runs in edge runtime.
- `sentry.server.config.ts` — Server-side Sentry initialization (DSN, traces sampling, PII settings) used by `instrumentation.ts` and server runtime.
- `tailwind.config.ts` — Tailwind CSS configuration (theme, plugins, content paths) used by PostCSS and build.
- `tsconfig.json` — TypeScript compiler configuration for the monorepo.
- `admin-docs/` — Operational documentation for the admin portal (setup, advanced editing, database free-auth guide). Contains step-by-step instructions for admin configuration and deployment.

**Developer Guide:** See [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) for task-oriented workflows and exact file mappings for common changes (forms, sync, mailer, and admin).


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Contributors
<a href="https://github.com/Agneepath-2025/regform/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Agneepath-2025/regform" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
