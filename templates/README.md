# templates — Email & HTML Templates

Overview
- Stores HTML/email templates used by the app for emails and receipts (signup, verification, payment confirmation etc.).

Files
- `payment-confirmed.html`, `payment-unconfirmed.html` — Payment notification emails.
- `registration.html`, `signup.html`, `verification.html` — Registration and verification emails.

Usage
- Templates are loaded by `api/Mailer/` and rendered with inlined variables before sending.

Maintenance
- Keep templates simple and inlined (many email clients strip external CSS).
- Test email rendering with popular clients (Gmail, Outlook).

---
*Simple catalog of user-facing templates.*