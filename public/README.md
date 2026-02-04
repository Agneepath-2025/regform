# public — Static Assets

Overview
- Static assets served as-is by Next.js `public/` folder (images, documents, pre-rendered markdown etc.).

Notable subfolders
- `documents/` — Uploaded or static PDFs and files
- `markdown/` — Public markdown resources

Guidelines
- Avoid storing secrets or large binary blobs here.
- For large file uploads, use external storage and serve via signed URLs.

---
*Public assets reference.*