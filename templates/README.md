# templates — Email & HTML Templates

Overview
- Stores HTML/email templates used by the app for emails and receipts (signup, verification, payment confirmation etc.).

Files

- `registration.html`, `signup.html`, `verification.html` — Registration, Signup and verification emails. (For initial user registration)
- `payment-confirmed.html`, `payment-unconfirmed.html` — Payment notification emails. (Sent after finance dept apporoves payment)
- `qr-code.html` — Sends qr code for entry for participants. (x days before event)

Usage
- Templates are loaded by `api/Mailer/` and rendered with inlined variables before sending.

Maintenance
- Keep templates simple and inlined (many email clients strip external CSS).
- Test email rendering with popular clients (Gmail, Outlook, Hotmail).

---