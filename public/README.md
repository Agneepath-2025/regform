# public — Static Assets

Overview
- Static assets served as-is by Next.js `public/` folder (images, documents, pre-rendered markdown etc.).

Notable subfolders
- `documents/` — Uploaded or static PDFs and files (Currently stores only Bank details)
- `markdown/` — Public markdown resources (Storing rulebooks for each sport)
- `logo.svg` — Agneepath logo: svg format (used in favicon)
- `logo2.png` — Agneepath logo: png format  (dashboard)

Guidelines
- Avoid storing secrets or large binary blobs here.
- For large file uploads, use external storage and serve via signed URLs.
- Divide into further subfolders and change paths as repository grows

---