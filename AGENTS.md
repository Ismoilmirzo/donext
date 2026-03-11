# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite + React frontend for DoNext with Supabase as the backend.

- `src/pages/`: route-level screens (`Landing`, `Auth`, `Dashboard`, `Progress`, `Settings`, `Onboarding`).
- `src/components/`: reusable UI grouped by domain (`dashboard/`, `progress/`, `layout/`, `ui/`).
- `src/hooks/`: data and state hooks (`useTasks`, `useScores`, `useWeekSummary`, etc.).
- `src/lib/`: shared logic and integrations (`supabase.js`, `auth.jsx`, `dates.js`, `scoring.js`).
- `src/styles/`: global stylesheet (`globals.css`).
- `supabase/migrations/`: SQL schema and trigger migrations.
- `public/`: static assets. `dist/` is build output; do not edit manually.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start local dev server (default `http://localhost:5173`).
- `npm run build`: produce production bundle in `dist/`.
- `npm run preview`: serve the built app locally for final checks.
- `npm run lint`: run ESLint across the project.

Database setup is documented in `SETUP.md`; apply SQL from `supabase/migrations/001_full_schema.sql` before full feature testing.

## Coding Style & Naming Conventions
- Use ES modules, React function components, and hooks-first patterns.
- Prefer 2-space indentation and single quotes in JS/JSX.
- Keep formatting consistent within a file (some legacy files mix semicolon styles).
- Components/pages: `PascalCase` filenames (for example, `PillarCard.jsx`).
- Hooks: `useCamelCase` naming (for example, `useProfile.js`).
- Utilities: concise lowercase filenames in `src/lib/`.
- Run `npm run lint` before opening a PR.

## Testing Guidelines
There is currently no automated test runner configured. Minimum contribution checks:

- `npm run lint`
- `npm run build`
- manual smoke test for auth, protected routes, dashboard check-in flow, and progress charts

When adding tests, colocate them near source files using `*.test.jsx` naming.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so follow Conventional Commit style:

- `feat: add weekly score trend card`
- `fix(auth): handle expired Supabase session`

PRs should include:

- clear summary of user-visible and technical changes
- linked issue/task ID
- verification steps (commands run + results)
- screenshots/video for UI changes
- note any migration files added under `supabase/migrations/`

## Security & Configuration Tips
- Never commit `.env`; keep secrets local.
- Client code should only use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Do not expose service-role keys in frontend code.
- Update `.env.example` when introducing new environment variables.
