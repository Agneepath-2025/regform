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

**Developer Guide:** See [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) for task-oriented workflows and exact file mappings for common changes (forms, sync, mailer, and admin).

#  add more documentation about other folders here.

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
