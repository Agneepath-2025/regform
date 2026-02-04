# Onboarding & Runbook — RegForm

Quick start for a new team taking over the project.

1) Get code and local dev running
- Clone repo
- Run `./scripts/setup-local.sh` (sets up Docker/Mongo, `.env.local`, installs deps)
- Run `npm run dev` and open `http://localhost:3000`

2) Important documentation to read (in order)
- `README.md` (project overview)
- `scripts/README.md` (deployment & backup scripts)
- `documentation/LOCAL_DEVELOPMENT.md` (local environment details)
- `documentation/BACKUP_RESTORE_SYSTEM.md` (backup/restore runbook)
- `documentation/PAYMENT_VERIFICATION_SETUP.md` (payments/webhooks)

3) Day-2 operational checklist
- Verify backups: `ls -lht /mnt/.../backups/regform` and check latest logs
- Check PM2 service and application logs: `pm2 status` / `pm2 logs regform`
- Verify scheduled syncs: instrumentations and `api/sync/` endpoints

4) Common tasks
- Deploy: `cd scripts && ./deploy.sh`
- Run manual backup: `./backup.sh`
- Restore a backup (interactive): `./restore.sh`
- Restart app: `pm2 restart regform`

5) Troubleshooting pointers
- Check Sentry for errors (`sentry.server.config.ts` / dashboard)
- Check audit logs (`utils/audit-logger.ts`)
- Payment issues: check `api/payments/` webhooks and Google Apps Script hooks (see docs)

---
*Keep this file short; add real contact names and incident channels when handing over.*