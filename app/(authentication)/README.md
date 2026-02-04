# app/(authentication) — Authentication Flows

Overview
- Sign-in, Sign-up, phone verification, and verification pages.
- Uses OAuth + phone number verification; review `auth.ts` and `api/auth` for server-side logic.

Key pages
- `enter-phone-number/` — Phone collection and verification initiation.
- `SignIn/`, `SignUp/` — Standard flows.
- `Verification/` — OTP verification and session creation.

Session & Tokens
- Session handling integrates with `session-provider.tsx` in the admin app and middleware.

Security
- Protect endpoints with middleware and rate limit verification attempts.

---
*Auth flows quick reference.*