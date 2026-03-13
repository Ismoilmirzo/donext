# DONEXT — Active TODO

---

## Daily Loop Visibility, Project Work Logs, and Seeded Onboarding

**Priority: HIGH** - These changes strengthen the app's daily habit loop, make project effort feel tangible, and reduce blank-state friction for new users.

### Goals

- [x] Keep today's habit progress visible outside the Habits page.
- [x] Surface project effort and recency more clearly on project surfaces.
- [x] Turn project detail into a simple work log with recent focus history.
- [x] Add a lightweight evening summary that mirrors the day's progress without extra input.
- [x] Let brand-new users start with a template instead of empty lists.

### Executed Plan

#### D1. Habit visibility across the app
- [x] Add a floating habit progress widget on authenticated pages outside Habits/Welcome.
- [x] Add a shared daily summary hook so habit/task/focus changes refresh the widget and summary banner.
- [x] Add PWA home-screen shortcuts for Habits, Focus, and Projects.

#### D2. Project progress surfacing
- [x] Make project cards emphasize invested focus time and last-worked recency.
- [x] Keep the existing efficiency/total-time context so project effort still feels measurable.

#### D3. Project focus history
- [x] Add a reusable project focus-history card component.
- [x] Query recent focus sessions on the project detail page.
- [x] Show date, task, focus time, and total elapsed time in a compact work log.

#### D4. Evening daily summary
- [x] Add a non-blocking summary banner after 8 PM when progress exists for the day.
- [x] Show compact daily totals first, then expandable missed habits and worked-project details.
- [x] Refresh summary data when habits are checked or tasks are completed.

#### D5. Onboarding template seed data
- [x] Add a welcome-screen action that seeds starter habits, a sample project, and sample tasks.
- [x] Keep the seed optional and only available for a truly empty account.
- [x] Refresh onboarding counts immediately after seeding so the next step stays accurate.

### Verification

- [x] Habit widget appears outside Habits/Welcome and links to `/habits`.
- [x] Evening summary appears only when it should and expands with missed-habit/project details.
- [x] Project detail shows recent focus history.
- [x] Welcome page can seed starter habits, project, and tasks for empty users.
- [x] Project cards still render correctly with clearer invested-time copy.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Final changes are pushed and deployed to `donext.uz`.

---

## Focus Intelligence, Task Context, and PWA Installability

**Priority: HIGH** - These changes tighten the app's core daily loop: smarter random picking, clearer task context, and easier repeat opening from the home screen.

### Goals

- [x] Keep the Focus picker opinionated, but give the user one re-roll per selection cycle.
- [x] Add project preferred time so random selection respects morning, afternoon, and evening.
- [x] Make task context visible during active focus by surfacing task notes below the title.
- [x] Make DoNext installable as a minimal PWA on phones and desktop.
- [x] Preserve the current product philosophy: guided choice, not full manual planning overload.

### Execution Plan

#### F1. Re-roll behavior
- [x] Review the existing `RerollButton` flow and tighten it into a clear one-re-roll-per-selection-cycle rule.
- [x] Prevent repeat re-roll chaining after the single retry is consumed.
- [x] Reset the re-roll allowance only when a new focus selection cycle begins.
- [x] Clarify the button copy/feedback so users know the second choice is final unless they switch to manual pick.

#### F2. Preferred time on projects
- [x] Add a migration for `projects.preferred_time` with allowed values: `any`, `morning`, `afternoon`, `evening`.
- [x] Add project create/edit controls for preferred time.
- [x] Reflect preferred time in project summaries and badges/details where useful.
- [x] Update random project selection logic:
  - prefer matching current time bucket + `any`
  - fall back to all eligible projects if no preferred-time match exists
- [x] Keep weighted randomness and deadline urgency intact on top of this filter.

#### F3. Task descriptions / notes
- [x] Confirm task description storage already exists and keep it backward-compatible.
- [x] Surface task description more clearly on the active focus screen.
- [x] Make sure task create/edit flows keep using a textarea and save descriptions correctly.
- [x] Preserve description visibility on project task rows and random pick cards.

#### F4. PWA / installability
- [x] Upgrade the manifest to match the current brand and theme color requirements.
- [x] Add install-grade app icons in `public/`.
- [x] Add a minimal service worker for offline shell caching.
- [x] Register the service worker from the frontend entrypoint.
- [x] Ensure SPA routes still work with GitHub Pages and custom domain hosting.

### Verification

- [x] Focus shows one re-roll, then disables or locks it until a new pick cycle starts.
- [x] Preferred-time projects are favored for the matching part of the day.
- [x] If no preferred-time project matches, Focus still picks from all eligible projects.
- [x] Active task screen shows task description when it exists.
- [x] `manifest.json` and service worker are included in the production build.
- [x] The app still loads on `donext.uz` after deployment.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Final changes are pushed and deployed to `donext.uz`.

---

## UX: Activation, Discoverability, and Pre-Login Language

**Priority: HIGH** - New users currently have to infer the product flow on their own. The app needs a clearer first-run path and better guidance before and after sign-in.

### Goals

- [x] Add language switching before login on public pages.
- [x] Give first-time users a clear in-app welcome/setup path.
- [x] Explain how Habits, Projects, Focus, and Stats fit together.
- [x] Improve empty states so they teach the next step instead of only stating that data is missing.
- [x] Make Focus less mysterious by explaining how project picking works.
- [x] Keep the UX lightweight; avoid turning DoNext into a heavy project-management tutorial.

### Executed Plan

#### U1. Pre-login language switch
- [x] Create a reusable locale switcher component using the existing `LocaleContext`.
- [x] Add it to the Landing page header.
- [x] Add it to the Auth page card/header.
- [x] Add it to the Privacy Policy page header.

#### U2. First-run activation page
- [x] Create a protected `WelcomePage` for first-time users.
- [x] Use `profiles.onboarding_done` to route newly signed-in users to `/welcome`.
- [x] Show a simple product explanation for Habits, Projects, Focus, and Stats.
- [x] Show a setup checklist based on actual user data:
  - first habit
  - first project
  - first task
  - first focus session
- [x] Add a clear primary CTA that sends the user to the next missing step.
- [x] Add a finish/continue CTA that marks onboarding as complete and opens the main app.
- [x] Add an in-app banner so the setup guide stays discoverable until onboarding is completed.

#### U3. Public-page clarity
- [x] Expand the Landing page with a more concrete “How DoNext works” section.
- [x] Add one realistic example flow so the random-picker concept feels tangible.
- [x] Improve Auth page helper copy so users understand sign-up, verification, and what happens next.

#### U4. In-app discoverability improvements
- [x] Improve project empty-state guidance.
- [x] Improve focus empty-state guidance and add a direct CTA to Projects.
- [x] Add a small Focus explainer card for first-use understanding.
- [x] Add a Stats empty-state guidance card for users without enough data yet.

### Verification

- [x] Public pages load in both English and Uzbek.
- [x] Language can be changed before login and persists across routes.
- [x] New authenticated users are redirected to `/welcome` until onboarding is completed.
- [x] Welcome page reflects setup progress from real user data.
- [x] The welcome CTA routes to the next logical step.
- [x] Focus and Stats empty states provide clear next actions.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Final changes are pushed and deployed to `donext.uz`.

---

## BUG: Focus Time Calculation Allows Invalid Data

**Priority: HIGH** — Corrupts all focus analytics (Stats page, project focus totals, daily focus bars).

### Problem

When completing a task, the user is shown a time input pre-filled from the elapsed timer. They can freely edit it to **any value** — including time far exceeding what actually elapsed. There is no validation anywhere in the chain.

**Example:** User starts a task, works for 3 minutes, taps "I'm Done", then types "5 hours 30 minutes" in the completion modal. The system happily saves 330 minutes to both `tasks.time_spent_minutes` and `focus_sessions.duration_minutes`. All stats, charts, and totals are now wrong.

### Root Cause (4 files)

1. **`CompleteTaskModal.jsx`** — Receives `timerSeconds` (elapsed) but only uses it as a pre-fill default. No max enforcement. User can type anything.
2. **`TimeInput.jsx`** — Hours field has no upper limit (`min="0"` only). Minutes capped at 59, but that's just per-field, not total.
3. **`FocusPage.jsx`** — Passes `timerSeconds` (local state from `ActiveTaskScreen`) but does NOT pass `started_at` (the DB source of truth). The modal has no way to compute the real ceiling.
4. **`useTasks.js:completeTask()`** — Stores `Math.max(0, Number(timeSpentMinutes))` — only floors at 0, no ceiling. Same uncapped value goes to `focus_sessions`.

### Fix Plan

**Principle:** User can reduce logged time (to subtract breaks) but cannot exceed actual elapsed wall-clock time. Minimum 1 minute.

#### F1. Pass `startedAt` to `CompleteTaskModal`
**File:** `FocusPage.jsx`
- Change: Instead of (or in addition to) `timerSeconds`, pass `startedAt={activePair.task.started_at}` as a prop to `CompleteTaskModal`
- The modal will compute `maxMinutes` from this, which is the real elapsed ceiling

#### F2. Add max-time enforcement in `CompleteTaskModal`
**File:** `CompleteTaskModal.jsx`
- Compute `maxMinutes = Math.max(1, Math.ceil((Date.now() - new Date(startedAt).getTime()) / 60000))` on modal open
- Pre-fill hours/minutes from `maxMinutes` (not from the passed-in `timerSeconds` — use the DB truth)
- Clamp `totalMinutes` to `[1, maxMinutes]` before calling `onSave`
- Show the max as context: "Maximum: Xh Ym (actual elapsed time)"
- If user's input exceeds max, show inline warning and clamp on save

#### F3. Add `maxTotal` prop to `TimeInput`
**File:** `TimeInput.jsx`
- Accept optional `maxTotalMinutes` prop
- When provided, clamp the combined `hours * 60 + minutes` to not exceed it
- When user increases hours beyond what's possible, auto-reduce; same for minutes
- Visual indicator when at maximum (e.g., muted text "max reached")

#### F4. Add server-side validation in `completeTask()`
**File:** `useTasks.js`
- Before saving, compute `elapsedMinutes = Math.ceil((Date.now() - new Date(task.started_at).getTime()) / 60000)`
- Clamp: `validMinutes = Math.max(1, Math.min(timeSpentMinutes, elapsedMinutes))`
- Use `validMinutes` for both `tasks.time_spent_minutes` and `focus_sessions.duration_minutes`
- This is the safety net — even if UI validation is bypassed, data stays valid

#### F5. Handle edge cases
- **Task started days ago** (user left app open): `maxMinutes` could be huge. This is actually correct — they might have worked that long. The cap prevents fabrication but allows legitimate long sessions.
- **Clock skew / started_at in future**: Floor `maxMinutes` at 1 minute minimum.
- **Modal opened, time passes, then save**: Recompute `maxMinutes` at save time (not just on open). Use the value at save time for the clamp.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/FocusPage.jsx` | Pass `startedAt` prop to CompleteTaskModal |
| `src/components/focus/CompleteTaskModal.jsx` | Compute max from `startedAt`, clamp input, show max context |
| `src/components/ui/TimeInput.jsx` | Add `maxTotalMinutes` prop with clamping |
| `src/hooks/useTasks.js` | Clamp `timeSpentMinutes` to elapsed time in `completeTask()` |

### Verification

After implementing, test these scenarios:
- [ ] Start task, work 5 min, complete — can enter 1-5 min, cannot enter 6+
- [ ] Start task, work 2 hours, complete — pre-fills 2h 0m, can reduce, cannot exceed
- [ ] Try typing 99 in hours field — gets clamped to max
- [ ] Start task, navigate away, come back 30 min later, complete — timer shows correct 30 min, max is 30
- [ ] Check Stats page — focus time numbers match actual elapsed times
- [ ] Check project detail — total focus time is sum of valid task times

---

## FEATURE: Focus Time vs Total Time Spent

**Priority: HIGH** — Needed to distinguish true focused work from total elapsed effort and unlock efficiency infographics.

### Product Decision

- `focus time` = minutes the user enters manually in the completion modal
- `total time spent` = actual elapsed wall-clock minutes between `started_at` and completion
- `overhead` = `total time spent - focus time`
- `efficiency` = `focus time / total time spent`

### Requirements

1. Keep all existing focus totals based on the user-entered value.
2. Add a second stored total-time metric without changing the meaning of current focus-time columns.
3. Support older rows that only have focus-time data by falling back gracefully.
4. Show both values in project summaries and Stats infographics.

### Data Model

**New columns**
- `tasks.total_time_spent_minutes INT`
- `focus_sessions.total_duration_minutes INT`

**Existing columns keep their meaning**
- `tasks.time_spent_minutes` = focused minutes
- `focus_sessions.duration_minutes` = focused minutes

### Completion Flow

#### FT1. Completion modal
**File:** `src/components/focus/CompleteTaskModal.jsx`
- Keep one editable input for focused time
- Show total elapsed time as read-only context
- Explain that focused time can be lower than total time spent

#### FT2. Save both metrics
**File:** `src/hooks/useTasks.js`
- Compute `totalElapsedMinutes` from `started_at`
- Clamp focused minutes to `[1, totalElapsedMinutes]`
- Save:
  - `tasks.time_spent_minutes = focusMinutes`
  - `tasks.total_time_spent_minutes = totalElapsedMinutes`
  - `focus_sessions.duration_minutes = focusMinutes`
  - `focus_sessions.total_duration_minutes = totalElapsedMinutes`

#### FT3. Backward compatibility
- When `total_time_spent_minutes` / `total_duration_minutes` is null on old rows, treat total time as equal to focus time
- That keeps existing charts and totals valid without a destructive backfill

### Infographics

#### FT4. Stats page
**Files:** `src/hooks/useStats.js`, `src/pages/StatsPage.jsx`, `src/components/stats/*`
- Hero card:
  - focused time
  - total time spent
  - efficiency %
  - overhead minutes
- Daily chart:
  - stacked bars for focused vs overhead time
- Project chart/list:
  - focused time
  - total time
  - efficiency % per project
- All-time/project summary:
  - average focus/task
  - average total/task
  - overall efficiency

#### FT5. Project surfaces
**Files:** `src/hooks/useProjects.js`, `src/pages/ProjectDetailPage.jsx`, `src/components/projects/ProjectCard.jsx`
- Show:
  - total focus time
  - total time spent
  - efficiency %
- Keep focus time as the primary value, with total/efficiency as supporting context

### Verification

- [ ] Complete a task with 40 min elapsed and 25 min focused -> totals store 25 focus / 40 total
- [ ] Stats hero shows both focused and total minutes
- [ ] Daily chart shows overhead as `total - focus`
- [ ] Project detail total focus remains the sum of user-entered minutes
- [ ] Older tasks without new total-time columns still render without errors

---

# DONEXT v1 → v3 Migration TODO (Reference — Completed)

> **Goal:** Transform current app (AI-powered weekly life planner with pillars)
> into v3 (Habits + Projects & Tasks with random picker and rich analytics).
> Spec: `donext-v3-build-prompt.md`
> Created: 2026-03-11

---

## Overview: What Changes

v3 is a near-complete rewrite. The only shared concepts are: Supabase auth, dark-mode Tailwind UI, React + Vite, and basic UI components.

| Concept | v1 (current) | v3 (target) |
|---------|-------------|-------------|
| Core loop | AI generates weekly schedule | Habits checklist + manual project tasks |
| Navigation | Today / Plan / Progress / Settings | Habits / Projects / Focus / Stats |
| Default route | `/dashboard` | `/habits` |
| Onboarding | 4-step wizard (schedule → pillars → goals → AI generation) | None (app is self-explanatory) |
| Task scheduling | Day + time slots in a week calendar | No scheduling. Random picker chooses next task |
| Pillars | 5 life dimensions (Mind, Career, etc.) | None. Projects are independent |
| AI integration | Claude API via Supabase Edge Function | None |
| Scoring | Weekly score formula (completion + reflection) | Focus time tracking + habit completion % |
| Icons | Emojis / react-icons | lucide-react |

---

## PHASE 0: Preparation

### 0.1 Install new dependencies
```bash
npm install lucide-react
```
**Already installed (verify):** `date-fns`, `recharts`, `@supabase/supabase-js`, `react-router-dom` — all required by v3 and already in `package.json`.

### 0.2 Remove unused dependencies
```bash
npm uninstall @supabase/auth-ui-react @supabase/auth-ui-shared react-icons
```
**Check first:** Verify `AuthPage.jsx` doesn't import from `@supabase/auth-ui-*`. Current code uses custom form — should be safe to remove.

### 0.3 Database migration
Run in Supabase SQL editor. **Back up data first.**

**Drop v1 tables** (order matters for foreign keys):
```sql
DROP TABLE IF EXISTS daily_reflections CASCADE;
DROP TABLE IF EXISTS weekly_summaries CASCADE;
DROP TABLE IF EXISTS weekly_goals CASCADE;
DROP TABLE IF EXISTS fixed_blocks CASCADE;
DROP TABLE IF EXISTS sleep_schedule CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;       -- v1 tasks schema is incompatible
DROP TABLE IF EXISTS pillars CASCADE;
```

**Modify profiles:**
```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT false;
```

**Create v3 tables** (5 tables: habits, habit_logs, projects, tasks, focus_sessions):
Copy exact SQL from `donext-v3-build-prompt.md` lines 87–185, including indexes and RLS policies.
Note: `tasks` is dropped above and recreated here with a completely different schema (project_id, sort_order, is_auto_generated, time_spent_minutes, started_at — no more day/time/week_start/pillar_id).

**Update handle_new_user trigger** to match v3 (no `onboarding_step`).

---

## PHASE 1: Project Setup & Routing (Step 1 of v3 spec)

### 1.1 Replace `src/App.jsx` routing
**Current:** `/dashboard`, `/plan`, `/progress`, `/settings`, `/onboarding`
**Target:** `/habits`, `/projects`, `/projects/:id`, `/focus`, `/stats`, `/settings`

- [ ] Remove `OnboardingRoute` component and `PublicOnlyRoute` onboarding redirect
- [ ] Change `PublicOnlyRoute` redirect from `/dashboard` to `/habits`
- [ ] Remove lazy import of `DashboardPage`, `WeekPlanPage`, `ProgressPage`, `OnboardingPage`
- [ ] Add lazy imports: `HabitsPage`, `ProjectsPage`, `ProjectDetailPage`, `FocusPage`, `StatsPage`
- [ ] Replace `requireCompletedOnboarding` with simple auth check
- [ ] New routes: `/habits`, `/projects`, `/projects/:id`, `/focus`, `/stats`, `/settings`

### 1.2 Update `BottomNav.jsx`
**Current:** Today(✅) / Plan(🗓️) / Progress(📈) / Settings(⚙️) with emojis, `md:hidden`
**Target:** Habits(CheckSquare) / Projects(FolderKanban) / Focus(Zap) / Stats(BarChart3) with lucide-react icons

- [ ] Replace links array with new tabs and routes
- [ ] Replace emoji icons with lucide-react icons: `CheckSquare`, `FolderKanban`, `Zap`, `BarChart3`
- [ ] Remove `md:hidden` — show nav on all screen sizes (or add desktop sidebar)
- [ ] Settings accessible from Settings page directly (not a nav tab), or keep as 5th tab

### 1.3 Update `AppShell.jsx`
- [ ] Add desktop sidebar/nav for `md:` screens (v3 spec says "sidebar on desktop")
- [ ] Update header content if needed

### 1.4 Simplify `ProtectedRoute.jsx`
**Current:** Has `requireCompletedOnboarding` prop checking `onboarding_step`
**Target:** Simple auth check only (no onboarding gate)

- [ ] Remove `requireCompletedOnboarding` prop and onboarding redirect logic
- [ ] Just check `user` exists, redirect to `/auth` if not

### 1.5 Update `AuthContext.jsx`
- [ ] `ensureProfile()`: Remove any `onboarding_step` references
- [ ] Profile type: `onboarding_done` (boolean) instead of `onboarding_step` (int)
- [ ] Remove pillar-related data from bootstrap if any

### 1.6 Fix `supabase.js` env var crash
**Current bug (B5):** Passes `undefined` to `createClient` when env vars missing.
- [ ] Throw an error or show "App not configured" screen instead of `console.warn`

### 1.7 Create new UI components
- [ ] `src/components/ui/ProgressBar.jsx` — reusable progress bar (used throughout v3)
- [ ] `src/components/ui/TimeInput.jsx` — hours:minutes dual input (for CompleteTaskModal)
- [ ] `src/components/ui/ColorPicker.jsx` — row of 10 color circles (for CreateProjectModal)
- [ ] `src/components/ui/EmptyState.jsx` — encouraging empty state with icon + message + CTA

### 1.8 Fix `Modal.jsx`
- [ ] Add backdrop click-to-close
- [ ] Add Escape key listener

---

## PHASE 2: Auth (Step 2 of v3 spec)

### 2.1 Update `AuthPage.jsx`
- [ ] On login, redirect to `/habits` (not `/dashboard`)
- [ ] Remove any onboarding redirects
- [ ] Verify Google OAuth still works
- [ ] Verify forgot password still works

### 2.2 Update `LandingPage.jsx`
**Current:** "Plan your week with AI" messaging, 3 steps about AI planning
**Target:** "Stop overthinking. Start doing." messaging, 3 features about habits/random picker/analytics

- [ ] New headline: "Stop overthinking. Start doing."
- [ ] New subheadline about habits + random task picker + charts
- [ ] 3 feature cards: "Daily Habits", "Random Task Picker", "Focus Analytics"
- [ ] CTA: "Get Started Free →" (arrow already missing per old TODO)
- [ ] Redirect authenticated users to `/habits`

---

## PHASE 3: Habits — Daily Checklist (Step 3 of v3 spec)

### 3.1 Create `src/hooks/useHabits.js`
- [ ] `fetchHabits()` — get active habits for user, ordered by `sort_order`
- [ ] `fetchHabitLogs(startDate, endDate)` — get logs for date range
- [ ] `toggleHabit(habitId, date, currentValue)` — upsert to `habit_logs` with optimistic update
- [ ] `addHabit(title, icon, color)` — insert with `sort_order = max + 1`
- [ ] `updateHabit(id, updates)` — edit title/icon/color
- [ ] `archiveHabit(id)` — set `is_active = false`
- [ ] `deleteHabit(id)` — permanent delete with confirmation
- [ ] `reorderHabits(habitId, direction)` — swap sort_order with adjacent habit

### 3.2 Create `src/pages/HabitsPage.jsx`
- [ ] Top section: "Today · [Day], [Month] [Date]" header
- [ ] HabitList with checkboxes for today
- [ ] Today's progress: "X/Y (Z%)" with ProgressBar
- [ ] "+ Add Habit" button
- [ ] Below: analytics section (weekly chart, monthly grid, per-habit breakdown, streak)
- [ ] This is the HOME SCREEN — must load fast

### 3.3 Create `src/components/habits/HabitCheckbox.jsx`
- [ ] Single habit row: checkbox + icon + title
- [ ] Checked state: emerald-500 fill, scale animation (0.9 → 1.1 → 1.0 over 200ms)
- [ ] Unchecked state: empty checkbox, no animation
- [ ] Optimistic toggle on tap

### 3.4 Create `src/components/habits/HabitList.jsx`
- [ ] Renders list of HabitCheckbox components
- [ ] Handles habit context menu (⋯ button): Edit / Archive / Delete
- [ ] Reorder capability (up/down arrow buttons)

### 3.5 Create `src/components/habits/AddHabitModal.jsx`
- [ ] Title input (required)
- [ ] Icon field (optional emoji, default "✓")
- [ ] "Save Habit" button

---

## PHASE 4: Habits — Analytics (Step 4 of v3 spec)

### 4.1 Create `src/components/habits/HabitWeeklyChart.jsx`
- [ ] Recharts BarChart with 7 bars (Mon–Sun)
- [ ] Bar height = (completed / total active) × 100
- [ ] Color coding: <50% red, 50-79% amber, 80%+ emerald
- [ ] Day labels below, percentage above each bar
- [ ] Current day bar has subtle glow/border
- [ ] "Week average: X%" below chart

### 4.2 Create `src/components/habits/HabitMonthlyGrid.jsx`
- [ ] CSS grid calendar for current month
- [ ] Cell color intensity by completion rate (0%, 1-49%, 50-79%, 80-99%, 100%)
- [ ] Future days: slate-800 with dashed border
- [ ] "March: 78% · 22/28 days" summary
- [ ] Streak counter: "🔥 X days" (consecutive days with ≥80% completion)

### 4.3 Create `src/components/habits/HabitStatsCard.jsx`
- [ ] Horizontal progress bars per active habit
- [ ] Shows monthly completion rate
- [ ] Sorted highest-first
- [ ] Bar color matches habit color

### 4.4 Create `src/components/habits/HabitStreakCard.jsx`
- [ ] Current streak + longest streak
- [ ] Streak = consecutive days with ≥80% habits completed

### 4.5 Streak calculation in `src/lib/dates.js` or `useHabits.js`
- [ ] `calculateStreak(habitLogs, activeHabitCount, today)` per v3 spec algorithm

---

## PHASE 5: Projects — CRUD (Step 5 of v3 spec)

### 5.1 Create `src/hooks/useProjects.js`
- [ ] `fetchProjects()` — all projects with task counts and completion stats
- [ ] `createProject(title, description, color)` — insert new project
- [ ] `updateProject(id, updates)` — edit title/description/color
- [ ] `completeProject(id)` — set status='completed', completed_at=now()
- [ ] `archiveProject(id)` — set status='archived'
- [ ] `reopenProject(id)` — set status='active'
- [ ] `deleteProject(id)` — permanent delete with cascade

### 5.2 Rewrite `src/hooks/useTasks.js`
**Current:** Fetches tasks by week_start, joins pillars, has addTask/updateTask/deleteTask/replaceWeekTasks
**Target:** Completely different schema — tasks belong to projects, no scheduling, no pillars

- [ ] `fetchTasks(projectId)` — ordered by sort_order
- [ ] `addTask(projectId, title, description, position)` — "Add to End" or "Add After Current"
- [ ] `updateTask(id, updates)` — edit title/description
- [ ] `completeTask(id, timeSpentMinutes)` — set status='completed', log focus_session
- [ ] `startTask(id)` — set status='in_progress', started_at=now()
- [ ] `reorderTasks(taskId, direction)` — swap sort_order (only pending tasks)
- [ ] `deleteTask(id)`

### 5.3 Create `src/pages/ProjectsPage.jsx`
- [ ] "Projects" header + "+ New Project" button
- [ ] "Active (N)" section with ProjectCard list
- [ ] "Completed (N)" section — collapsed by default, expandable
- [ ] Each card taps to `/projects/:id`

### 5.4 Create `src/components/projects/ProjectCard.jsx`
- [ ] Color dot/border in project color
- [ ] Title, progress bar (completed/total tasks), "Last worked: X" relative time
- [ ] "⚠️ Needs review" badge if auto-review task exists
- [ ] Completed variant: title, completion date, total focus time, Reopen/Archive actions

### 5.5 Create `src/components/projects/CreateProjectModal.jsx`
- [ ] Title (required), Description (optional), Color picker (10 circles)
- [ ] "Create Project" button

### 5.6 Create `src/pages/ProjectDetailPage.jsx`
- [ ] Back button + ⋯ menu (Edit project / Archive / Delete)
- [ ] Project title, description, progress bar, total focus time
- [ ] Ordered task list (TaskRow components)
- [ ] Completed tasks: ✅ strikethrough + time spent + date
- [ ] First pending task: highlighted with emerald border ("next up")
- [ ] Other pending tasks: dimmer style
- [ ] Reorder pending tasks (up/down arrows)
- [ ] "+ Add Task" button → AddTaskModal
- [ ] "Mark Project Complete" button (only when all tasks done)
- [ ] Celebration on project completion ("🎉 Project complete! Total focus time: Xh Ym across Z sessions") — can be inline or a simple reusable component

### 5.7 Create `src/components/projects/TaskRow.jsx`
- [ ] Completed: ✅ + strikethrough title + time + date
- [ ] Next (first pending): accent border, slightly elevated
- [ ] Pending: normal style
- [ ] Tooltip on tap: "Go to Focus tab to start working on this"

### 5.8 Create `src/components/projects/AddTaskModal.jsx`
- [ ] Title (required), Description (optional)
- [ ] "Add to End" and "Add After Current Task" buttons

### 5.9 Create `src/components/projects/ReorderableTasks.jsx`
- [ ] Up/down arrow buttons for pending tasks
- [ ] Completed tasks locked in position

### 5.10 Create `src/components/projects/ProjectStatusBadge.jsx`
- [ ] Active / Completed / Archived / Needs Review badges

---

## PHASE 6: Auto-Review Task (Step 6 of v3 spec)

### 6.1 Implement `all_tasks_done_at` tracking
- [ ] When a task is completed, check if it was the last pending task in the project
- [ ] If yes, set `projects.all_tasks_done_at = now()`

### 6.2 Implement `checkForStaleProjects()`
- [ ] Run on app load (in AuthContext or AppShell)
- [ ] For each active project: if all tasks done and `all_tasks_done_at` is >3 days ago and no pending auto-generated task exists
- [ ] Auto-insert: `"Review [Project Title] and add next steps"` with `is_auto_generated = true`

---

## PHASE 7: Focus — Random Picker (Step 7 of v3 spec)

### 7.1 Create `src/lib/random.js`
- [ ] `selectRandomProject(projects, focusSessions)` — weighted random by staleness
- [ ] Projects worked on least recently get higher weight
- [ ] Never-worked-on projects get weight 10
- [ ] Weight = daysSince + 1 (minimum 1)

### 7.2 Create `src/hooks/useFocusSessions.js`
- [ ] `fetchSessions(startDate, endDate)` — for analytics and weighting
- [ ] `createSession(taskId, projectId, date, durationMinutes)` — log on task complete
- [ ] `getTodaySessions()` — for "Today's Focus" summary on Focus page

### 7.3 Create `src/pages/FocusPage.jsx`
Three states:
- [ ] **State A (Ready):** Big "🎲 Start a Task" button, "or pick manually" text link, today's focus summary, recent completed tasks
- [ ] **State B (Selected):** RandomProjectCard showing selected project + next task, "Let's Go ▶" button, re-roll button (1 use)
- [ ] **State C (Working):** ActiveTaskScreen with elapsed timer, motivational one-liner, "✓ I'm Done" button

### 7.4 Create `src/components/focus/StartTaskButton.jsx`
- [ ] Big, full-width, emerald, centered — impossible to miss
- [ ] "🎲 Start a Task"

### 7.5 Create `src/components/focus/RandomProjectCard.jsx`
- [ ] Shows project name (color dot), task number (e.g., "Task #6 of 8"), task title (large), description
- [ ] "Let's Go ▶" button — starts the session
- [ ] Slide-up animation on appear

### 7.6 Create `src/components/focus/RerollButton.jsx`
- [ ] "🎲 Pick a different one (1)" → after use → "(0)" disabled
- [ ] Hidden if only 1 eligible project

### 7.7 "Or pick manually" expandable list
- [ ] Inline dropdown showing active projects with their next task
- [ ] Tapping one starts that specific project's next task

---

## PHASE 8: Focus — Active Work Session (Step 8 of v3 spec)

### 8.1 Create `src/components/focus/ActiveTaskScreen.jsx`
- [ ] Project name (muted), task title (large, centered)
- [ ] Elapsed timer: `H:MM:SS` format, big mono font, updates every second
- [ ] Timer uses `started_at` from DB — persists across page reloads
- [ ] Random motivational one-liner from curated list (5 options per spec)
- [ ] "✓ I'm Done" button (emerald, large)

### 8.2 Create `src/components/focus/CompleteTaskModal.jsx`
- [ ] "Nice work!" header
- [ ] Hours + Minutes inputs (TimeInput component)
- [ ] "Timer says: Xh Ym" reference line
- [ ] "Save & Continue" button
- [ ] On save: update task status, insert focus_session, check all-tasks-done

### 8.3 Post-completion flow
- [ ] If all project tasks done: "🎉 All tasks in [Project] are done! [Add More Tasks] or [Complete Project]"
- [ ] If more tasks remain: "✓ Task complete! [Start Another Task] or [Done for Now]"

---

## PHASE 9: Stats Page (Step 9 of v3 spec)

### 9.1 Create `src/hooks/useStats.js`
- [ ] `getFocusStats(startDate, endDate)` — total minutes, by-date, by-project, session count
- [ ] `getHabitStats(startDate, endDate)` — overall rate, per-habit rates
- [ ] `getProjectStats()` — active count, completed this month, tasks completed, avg time per task
- [ ] Period comparison (delta vs previous period)

### 9.2 Create `src/pages/StatsPage.jsx`
- [ ] Period selector tabs: "This Week" / "This Month"
- [ ] Three sections: Focus Time, Habits, Projects

### 9.3 Create `src/components/stats/FocusTimeChart.jsx`
- [ ] Hero card: total hours + delta vs last period (green/red)

### 9.4 Create `src/components/stats/DailyFocusBar.jsx`
- [ ] Recharts BarChart: hours per day, green bars, rounded top
- [ ] "Avg: Xh Ym / day" below

### 9.5 Create `src/components/stats/ProjectProgressChart.jsx`
- [ ] Recharts PieChart / donut: focus time by project
- [ ] Colored by project color, labels with project name + time

### 9.6 Create `src/components/stats/WeeklyOverviewCard.jsx`
- [ ] Habit weekly completion %, best/worst habit, streak

### 9.7 Create `src/components/stats/MonthlyOverviewCard.jsx`
- [ ] Recharts AreaChart: weekly focus hours over last 8 weeks
- [ ] Gradient fill (emerald to transparent)
- [ ] "Trend: +X% vs last month"

### 9.8 Create `src/components/stats/AllTimeStatsCard.jsx`
- [ ] Active projects, completed this month, tasks completed, avg time per task

---

## PHASE 10: Settings + Polish (Step 10 of v3 spec)

### 10.1 Rewrite `SettingsPage.jsx`
**Current:** Display name, pillars editor, timezone, sleep schedule link, delete account, about
**Target:** Profile (name, email), Habits (manage link), Projects (archived link), Account (logout, delete), About

- [ ] Remove pillar editing section
- [ ] Remove timezone selector (or keep if useful)
- [ ] Remove "Manage fixed blocks" link
- [ ] Add "Manage habits" → opens list with reorder/edit/archive
- [ ] Add "View archived projects" → list of archived projects with restore option
- [ ] Keep "Log out" and "Delete account" (fix B1: actually delete auth user)
- [ ] Keep About section

### 10.2 Delete all v1-only files

**Pages to delete:**
- [ ] `src/pages/DashboardPage.jsx`
- [ ] `src/pages/WeekPlanPage.jsx`
- [ ] `src/pages/ProgressPage.jsx`
- [ ] `src/pages/OnboardingPage.jsx`

**Components to delete:**
- [ ] `src/components/onboarding/ScheduleStep.jsx`
- [ ] `src/components/onboarding/PillarsStep.jsx`
- [ ] `src/components/onboarding/GoalsStep.jsx`
- [ ] `src/components/onboarding/GeneratingStep.jsx`
- [ ] `src/components/schedule/WeekCalendar.jsx`
- [ ] `src/components/schedule/TaskCard.jsx`
- [ ] `src/components/schedule/AvailableHours.jsx`
- [ ] `src/components/reflection/DailyReflection.jsx`
- [ ] `src/components/reflection/MoodSelector.jsx`
- [ ] `src/components/focus/NextTaskCard.jsx` (v1 focus component)
- [ ] `src/components/focus/TaskTimer.jsx` (v1 timer — v3 timer is different)
- [ ] `src/components/focus/SkipModal.jsx`
- [ ] `src/components/focus/CompletionCelebration.jsx`
- [ ] `src/components/focus/DayProgress.jsx`
- [ ] `src/components/focus/EmptyState.jsx`
- [ ] `src/components/progress/WeekScoreCard.jsx`
- [ ] `src/components/progress/PillarBreakdown.jsx`
- [ ] `src/components/progress/WeeklyChart.jsx`
- [ ] `src/components/ui/PillarBadge.jsx`

**Hooks to delete:**
- [ ] `src/hooks/usePillars.js`
- [ ] `src/hooks/useSleepSchedule.js`
- [ ] `src/hooks/useFixedBlocks.js`
- [ ] `src/hooks/useWeeklyGoals.js`
- [ ] `src/hooks/useDailyReflection.js`
- [ ] `src/hooks/useWeeklySummary.js`
- [ ] `src/hooks/useStreakDays.js`

**Lib to delete:**
- [ ] `src/lib/scoring.js`
- [ ] `src/lib/planner.js`

**Edge Functions to delete:**
- [ ] `supabase/functions/generate-tasks/index.ts`
- [ ] `supabase/functions/delete-account/index.ts` (replace with proper auth user deletion)

**Directories to remove (after deleting all files):**
- [ ] `src/components/onboarding/`
- [ ] `src/components/schedule/`
- [ ] `src/components/reflection/`

### 10.3 Update `src/lib/dates.js`
**Current:** getWeekStart, getWeekDates, getWeekDaysArray, toISODate, getISODayOfWeek, parseTimeToMinutes, formatTime, calculateAvailableHours, getAvailableHoursMap, getWeekRangeLabel
**Target:** Week/month boundary helpers only

- [ ] Keep: `toISODate`, `getWeekStart` (useful for stats)
- [ ] Add: `getMonthStart`, `getMonthEnd`, `getWeekEnd`, `getWeekDays` (for chart labels)
- [ ] Remove: `parseTimeToMinutes`, `formatTime`, `calculateAvailableHours`, `getAvailableHoursMap`, `getISODayOfWeek` (v1-only)
- [ ] Add: `formatRelativeTime(date)` — "2 hours ago", "Yesterday", "3 days ago" (for ProjectCard)

### 10.4 Update `globals.css`
- [ ] Remove v1-specific keyframes if unused (scaleIn, fadeOut may still be useful)
- [ ] Remove duplicate font import (keep only `index.html` `<link>`)
- [ ] Add habit checkbox animation keyframe

### 10.5 Responsive design
- [ ] All pages must work at 375px width (mobile primary)
- [ ] Desktop sidebar nav for `md:` screens
- [ ] Bottom nav for mobile

### 10.6 Loading & empty states
- [ ] Every page: LoadingSpinner while fetching
- [ ] Every list: EmptyState with icon + message + CTA when empty
  - "No habits yet. Add your first daily habit to start tracking."
  - "No projects yet. Create your first one to start tracking progress."
  - "No focus sessions yet. Start a task to begin."

### 10.7 Error handling
- [ ] Failed saves: subtle toast error + revert optimistic update
- [ ] Network issues: graceful degradation

---

## FILES THAT STAY (with modifications)

| File | Changes needed |
|------|---------------|
| `src/main.jsx` | None |
| `src/App.jsx` | Complete rewrite of routes (Phase 1.1) |
| `src/lib/supabase.js` | Fix env var crash (Phase 1.6) |
| `src/lib/dates.js` | Remove v1 helpers, add v3 helpers (Phase 10.3) |
| `src/contexts/AuthContext.jsx` | Remove onboarding_step refs, use onboarding_done (Phase 1.5) |
| `src/hooks/useProfile.js` | Minor: profile shape changes (onboarding_done) |
| `src/hooks/useTasks.js` | Complete rewrite (Phase 5.2) |
| `src/components/layout/AppShell.jsx` | Add desktop nav (Phase 1.3) |
| `src/components/layout/BottomNav.jsx` | New tabs + lucide icons (Phase 1.2) |
| `src/components/layout/ProtectedRoute.jsx` | Simplify (Phase 1.4) |
| `src/components/layout/ErrorBoundary.jsx` | None |
| `src/components/ui/Button.jsx` | None |
| `src/components/ui/Card.jsx` | None |
| `src/components/ui/Input.jsx` | None |
| `src/components/ui/TextArea.jsx` | None |
| `src/components/ui/Modal.jsx` | Add backdrop close + Escape key (Phase 1.8) |
| `src/components/ui/LoadingSpinner.jsx` | None |
| `src/pages/LandingPage.jsx` | New copy + features (Phase 2.2) |
| `src/pages/AuthPage.jsx` | Change redirect to /habits (Phase 2.1) |
| `src/pages/SettingsPage.jsx` | Rewrite sections (Phase 10.1) |
| `src/styles/globals.css` | Minor cleanup (Phase 10.4) |
| `index.html` | None (keep Inter font link) |
| `package.json` | Add/remove deps (Phase 0) |
| `vite.config.js` | None |
| `tailwind.config.js` | None |
| `postcss.config.js` | None |

---

## NEW FILES TO CREATE (38 files)

```
src/lib/random.js
src/hooks/useHabits.js
src/hooks/useProjects.js
src/hooks/useFocusSessions.js
src/hooks/useStats.js
src/pages/HabitsPage.jsx
src/pages/ProjectsPage.jsx
src/pages/ProjectDetailPage.jsx
src/pages/FocusPage.jsx
src/pages/StatsPage.jsx
src/components/ui/ProgressBar.jsx
src/components/ui/TimeInput.jsx
src/components/ui/ColorPicker.jsx
src/components/ui/EmptyState.jsx
src/components/habits/HabitCheckbox.jsx
src/components/habits/HabitList.jsx
src/components/habits/AddHabitModal.jsx
src/components/habits/HabitWeeklyChart.jsx
src/components/habits/HabitMonthlyGrid.jsx
src/components/habits/HabitStatsCard.jsx
src/components/habits/HabitStreakCard.jsx
src/components/projects/ProjectCard.jsx
src/components/projects/CreateProjectModal.jsx
src/components/projects/TaskRow.jsx
src/components/projects/AddTaskModal.jsx
src/components/projects/ReorderableTasks.jsx
src/components/projects/ProjectStatusBadge.jsx
src/components/focus/StartTaskButton.jsx
src/components/focus/RandomProjectCard.jsx
src/components/focus/ActiveTaskScreen.jsx
src/components/focus/CompleteTaskModal.jsx
src/components/focus/RerollButton.jsx
src/components/stats/FocusTimeChart.jsx
src/components/stats/DailyFocusBar.jsx
src/components/stats/ProjectProgressChart.jsx
src/components/stats/WeeklyOverviewCard.jsx
src/components/stats/MonthlyOverviewCard.jsx
src/components/stats/AllTimeStatsCard.jsx
```

---

## IMPLEMENTATION ORDER (recommended)

1. **Phase 0** — Deps + DB migration (do first, everything depends on this)
2. **Phase 1** — Routing + layout + UI components (app skeleton)
3. **Phase 2** — Auth + Landing (users can sign in)
4. **Phase 10.2** — Delete v1 files (clean slate before building v3 features)
5. **Phase 3** — Habits checklist (home screen, daily core loop)
6. **Phase 4** — Habits analytics (charts and stats)
7. **Phase 5** — Projects CRUD (second core system)
8. **Phase 6** — Auto-review tasks
9. **Phase 7** — Focus random picker
10. **Phase 8** — Focus work session
11. **Phase 9** — Stats page
12. **Phase 10** (remaining) — Settings rewrite + polish + responsive + empty/loading states

---

## TOTAL SCOPE SUMMARY

| Category | Count |
|----------|-------|
| Files to delete | 34 (4 pages + 19 components + 7 hooks + 2 lib + 2 edge functions) |
| Files to keep unchanged | 10 (main.jsx, ErrorBoundary, Button, Card, Input, TextArea, LoadingSpinner, index.html, vite/tailwind/postcss configs) |
| Files to modify | 15 (App.jsx, supabase.js, dates.js, AuthContext, useProfile, useTasks, AppShell, BottomNav, ProtectedRoute, Modal, LandingPage, AuthPage, SettingsPage, globals.css, package.json) |
| Files to create | 38 |
| New DB tables | 5 (habits, habit_logs, projects, tasks, focus_sessions) |
| DB tables to drop | 7 (tasks dropped and recreated with new schema) |
| New hooks | 4 (useHabits, useProjects, useFocusSessions, useStats) |
| New pages | 5 (Habits, Projects, ProjectDetail, Focus, Stats) |
| Packages to install | 1 (lucide-react) |
| Packages to remove | 3 (auth-ui-react, auth-ui-shared, react-icons) |
