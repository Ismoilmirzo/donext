# DoNext MVP Setup

## 1) Install dependencies

```bash
npm install
```

## 2) Configure environment

Create `.env.local` (or `.env`) in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3) Apply database schema

Run the SQL from one of these:

- `supabase/migrations/003_donext_mvp_schema.sql` (clean reset)
- `supabase/migrations/004_non_destructive_mvp_upgrade.sql` (upgrade existing schema)

This migration is destructive (it resets existing DoNext tables) so use it on a fresh project or when you intentionally want a clean rebuild.

## 4) Deploy Edge Function

Function path:

- `supabase/functions/generate-tasks/index.ts`

Set Anthropic key as Supabase secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Deploy function:

```bash
supabase functions deploy generate-tasks
```

## 5) Run app

```bash
npm run dev
```

Then open `http://localhost:5173`.

## 6) Quick checks

1. Sign up (email/password or Google)
2. Complete onboarding (schedule, pillars, goals, generation, review)
3. Open dashboard and mark tasks done/skip
4. Open Plan, Progress, and Settings tabs
