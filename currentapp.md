# DoNext: Current App Summary

## Overview

DoNext is a lightweight productivity web app built around four connected areas:

- Habits: daily consistency tracking
- Projects: active project and task management
- Focus: one-task-at-a-time work sessions with guided task selection
- Stats: habit, focus, project, and efficiency analytics

The product direction is intentionally simpler than a full task manager. It aims to reduce decision friction, especially in the Focus flow, rather than expose a large planning system.

## Current Tech Stack

- Frontend: React 18 + Vite
- Routing: React Router
- UI: Tailwind CSS + custom components
- Icons: Lucide React
- Charts: Recharts
- Backend: Supabase
  - Auth
  - Postgres database
  - Row Level Security
  - Edge Functions
- Deployment: GitHub Pages
- Live domain: `https://donext.uz`

## Public App Surface

### Landing Page

The landing page is no longer just a generic marketing page. It now explains:

- what DoNext is
- how the product loop works
- a concrete example project/task flow
- why Focus exists

It includes a language switcher before login.

### Auth Page

The auth page currently supports:

- email sign-up
- email login
- email verification by code
- Google sign-in
- forgot password

The page includes helper copy explaining:

- what happens after sign-up
- what the verification step means
- what Google sign-in does

It also includes a pre-login language switcher.

### Privacy Policy

There is a public privacy policy page at `/privacy/`, available before login and localized through the app locale system.

## Authentication and User Setup

### Auth Providers

The app currently supports:

- email/password auth
- email confirmation / OTP verification on sign-up
- Google OAuth

Supabase Auth is the source of truth for authentication.

### Profile Creation

On first successful auth, the app ensures a `profiles` row exists. If it does not, one is created automatically with:

- `id`
- `display_name`
- `onboarding_done = false`

### First-Run Onboarding Flow

The app now uses `profiles.onboarding_done` as a real route gate.

Current behavior:

- signed-out users can access public pages
- signed-in users who have not finished onboarding are sent to `/welcome`
- signed-in users who already finished onboarding are sent to `/habits`

The Welcome page includes:

- a short explanation of Habits, Projects, Focus, and Stats
- a live checklist based on user data
- a CTA to the next missing step
- a "continue anyway" button that marks onboarding complete

Users who have not completed onboarding also see a setup banner inside the app linking back to the welcome guide.

## Main Authenticated Sections

### 1. Habits

The habits system currently supports:

- creating habits
- marking daily completions
- streak tracking
- monthly history / heatmap style visualization
- streak-freeze support

#### Streak Freezes

Current streak-freeze behavior:

- users earn `1` streak freeze per week
- freeze storage caps at `2`
- missed days are automatically protected if a freeze is available
- frozen days are shown with a snowflake indicator
- the UI shows current freeze inventory like `0/2`, `1/2`, `2/2`
- the app communicates when the next freeze will be granted

This is designed to preserve streaks without requiring manual activation.

### 2. Projects

The project system currently supports:

- creating projects
- editing project metadata
- archiving projects
- unarchiving projects
- deleting projects
- completing projects
- viewing archived projects

Important actions use confirmation modals rather than silent state changes.

#### Project Priority and Deadlines

Projects now support:

- `priority_tag`: `urgent`, `normal`, `someday`
- optional `deadline_date`

These values influence the Focus recommendation system:

- Urgent projects get the highest weight
- Normal projects get medium weight
- Someday projects get the lowest weight
- projects with deadlines within 7 days are effectively bumped into urgent weighting
- overdue projects show a warning badge

The goal is weighted randomness rather than strict deterministic prioritization.

#### Archived Project Visibility

Archived projects are visible in:

- the Projects page
- Settings

Users can restore archived projects from both places.

### 3. Tasks

Tasks currently support:

- creation inside projects
- active/in-progress state
- completion
- focus time capture
- total elapsed time capture

The completion flow is intentionally tied to Focus rather than being treated as a generic checkbox list.

### 4. Focus

The Focus page is one of the app's core differentiators.

It currently supports:

- random project/task selection from eligible active projects
- manual task selection fallback
- active task timing
- document title timer updates while a task is active
- completion flow with focused-time entry
- recent completed task visibility

#### Focus Timer UX

While a task is running, `document.title` is updated every second to show elapsed time, so the browser tab remains informative even when the user switches away from the app.

The title resets when:

- the task is completed
- the user leaves the active task screen

#### Focus Time vs Total Time

The app now tracks two separate concepts:

- `focus time`: user-entered focused minutes
- `total time spent`: elapsed wall-clock time

This allows the app to calculate:

- overhead time
- efficiency percentage

The save flow clamps invalid focus entries so they cannot exceed actual elapsed time.

### 5. Stats

The Stats section currently includes:

- focus time analytics
- total time spent analytics
- overhead analytics
- efficiency analytics
- project breakdowns
- habit summaries
- streak-freeze notices

For newer users with little data, Stats now shows guidance instead of presenting an empty or confusing dashboard.

## Admin Capabilities

The app includes a private admin area at `/admin/users`.

This is protected in two layers:

- frontend visibility is limited to configured admin accounts
- backend protection is enforced by a Supabase Edge Function

### Admin Users Dashboard

The admin dashboard currently supports:

- listing users
- seeing signup and last-login metadata
- seeing onboarding completion state
- seeing summary counts for habits, projects, tasks, and focus time
- drilling into a user for recent habits, projects, tasks, and focus sessions
- suspending a user
- unsuspending a user
- deleting a user

User management is backed by the `admin-list-users` Edge Function.

## Account Management

From Settings, a signed-in user can currently:

- update display name
- change app language
- see and restore archived projects
- sign out
- delete their account
- open the privacy policy
- open the Telegram support link

Account deletion is handled by a Supabase Edge Function and includes cleanup of the app-side profile record.

## Localization

The app currently supports:

- English
- Uzbek

Localization is available:

- before login
- after login
- across core product surfaces

Language preference is stored locally and reused across routes.

## Data Model Highlights

Key persisted areas include:

- `profiles`
- `habits`
- `habit_logs`
- `projects`
- `tasks`
- `focus_sessions`
- `streak_freezes`

Notable newer schema additions:

- `projects.priority_tag`
- `projects.deadline_date`
- `tasks.total_time_spent_minutes`
- `focus_sessions.total_duration_minutes`
- `streak_freezes` table

## Current UX Direction

The current shipped UX aims to make the app more understandable to first-time users without turning it into a heavy productivity suite.

Recent UX changes focused on:

- pre-login language access
- first-run onboarding clarity
- better public-page explanation
- guided empty states
- making Focus easier to understand

## Deployment State

Current production deployment details:

- app is deployed through GitHub Pages
- custom domain is `https://donext.uz`
- deploys are automated from the repository workflow

## Current Product Positioning

At its current version, DoNext is best described as:

"A lightweight productivity system that combines habits, projects, and one-task-at-a-time focus guidance, with analytics that distinguish focused work from total time spent."

## Practical User Journey

A typical current user journey looks like this:

1. Visit landing page
2. Choose language before login if needed
3. Sign up with email or Google
4. Verify email if signing up by email
5. Enter the welcome/setup flow
6. Add a habit
7. Create a project
8. Add tasks
9. Start a focus session
10. Review stats as real data builds up

## Known Architectural Characteristics

- The app is frontend-heavy and relies on Supabase for auth, persistence, and admin/server actions.
- Authorization-sensitive operations are handled through protected Supabase Edge Functions.
- The product now has a clearer onboarding gate, but it still uses a multi-page app structure rather than a single dashboard homepage.

## Summary

The current version of DoNext is no longer just a basic CRUD app for tasks and habits. It now includes:

- guided onboarding
- public-page product education
- bilingual UX before and after auth
- weighted project selection
- deadlines and urgency
- streak freezes
- focus vs total-time analytics
- admin user management
- safer confirmations for important actions

The shipped version is positioned as a practical, opinionated productivity app that reduces planning friction rather than maximizing feature complexity.
