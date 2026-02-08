# components — UI Components

Overview
- Reusable React components used across the app (authentication UI, dashboard widgets, form controls).
- Strive for small, focused components. Prefer composition over inheritance.

Guidelines
- Naming: `PascalCase` for components, file name matches component name.
- Styling: Use Tailwind c lasses and module CSS files where needed (`styles/`).
- Accessibility: Use semantic HTML and labels on inputs; add aria- attributes when needed.

Where to find things
- `components/authentication/` — Sign in/up components
- `components/dashboard/` — Dashboard specific widgets
- `components/ui/` — Generic buttons, inputs, modals

Testing & Storybook
- There is no Storybook currently; consider adding one to simplify component testing.

---
*Use this as the first stop when modifying UI.*