# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DoNext — a lightweight productivity web app (habits, projects, focus sessions, stats) deployed at https://donext.uz. Intentionally simpler than a full task manager; designed to reduce decision friction, especially in the Focus flow.

## Commands

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build to dist/
npm run lint         # ESLint check
npm run preview      # Serve built app locally
```

No automated test runner. Verify changes with `npm run lint && npm run build` plus manual smoke testing (auth, routes, habits, focus flow, stats).

## Tech Stack

- **Frontend:** React 18 + Vite 7 + React Router 6 (BrowserRouter with lazy code splitting)
- **Styling:** Tailwind CSS 4 with CSS custom properties for theming (4 themes: day/night/midnight/mocha via `data-theme` attribute)
- **Backend:** Supabase (Auth, Postgres with RLS, Edge Functions)
- **Charts:** Recharts | **Icons:** Lucide React | **Dates:** date-fns
- **Deployment:** GitHub Pages (auto-deploy from main), custom domain via CNAME
- **PWA:** Service worker + manifest in `public/`
- **i18n:** Manual translation map in `src/lib/i18n.js` (English + Uzbek)

## Architecture

**Data flow:** Pages → custom hooks (data layer) → Supabase client → Postgres with RLS. No Redux or state library; React Context for auth, locale, and theme only.

**Key directories:**
- `src/pages/` — Route-level screens, lazy-loaded in `App.jsx`
- `src/components/` — Domain-grouped components (`habits/`, `projects/`, `focus/`, `stats/`, `layout/`, `ui/`)
- `src/hooks/` — Data hooks (`useTasks`, `useProjects`, `useHabits`, `useFocusSessions`, `useStats`, `useDailySummary`, `useProfile`). Each hook owns its Supabase queries and filters by user_id.
- `src/lib/` — Utilities: `supabase.js` (client init), `i18n.js`, `dates.js`, `projectPriority.js`, `streaks.js`, `appEvents.js`
- `src/contexts/` — `AuthContext` (Supabase auth + profile), `LocaleContext`, `ThemeContext`
- `supabase/migrations/` — SQL schema migrations (latest: 009). Core tables: profiles, habits, habit_logs, projects, tasks, focus_sessions
- `supabase/functions/` — Edge Functions (account-delete-user, admin-list-users)

**Route guards:** `ProtectedRoute` redirects unauthenticated users. `PublicOnlyRoute` redirects authenticated users. Onboarding gate: users with `profile.onboarding_done === false` are sent to `/welcome`.

**Theming:** CSS variables (`--dn-surface-*`, `--dn-text-*`, `--dn-accent-*`) defined in `src/styles/globals.css`, switched via `data-theme` attribute on document root.

## Coding Conventions

- ES modules, React function components, hooks-first patterns
- 2-space indent, single quotes in JS/JSX
- PascalCase component filenames, `useCamelCase` hook filenames, lowercase lib filenames
- Conventional Commits: `feat:`, `fix:`, `chore:`, etc.
- Files should stay under 500 lines

## Environment Variables

Build-time (prefixed `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAILS`. These are set as GitHub repo variables for CI, not committed as `.env`.

## Deployment

Pushes to `main` auto-deploy via `.github/workflows/deploy-pages.yml`. The workflow copies `dist/index.html` to `dist/404.html` for SPA fallback. Vite base must stay `'/'` for the custom domain. Build-time env vars come from GitHub repo variables.
