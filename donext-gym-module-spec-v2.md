# DoNext Gym Module — Complete Build Specification (v2)

**Route namespace:** `donext.uz/gym`
**Stack (inherited):** React 18 + Vite, Tailwind, Recharts, Supabase (Postgres + Auth + RLS + Edge Functions), Lucide React, Vercel. Installable PWA via Vite PWA Plugin — "downloadable as an app on mobile" is already solved; the gym module ships inside the same PWA.

This supersedes the earlier plan. It keeps the same data model and DoNext integration but fully specifies every screen, the specialization flow end-to-end, the API surface, and the build order. The three data files are done and validated and are the source of truth this spec consumes:

- `exercise_catalog.json` — 45 exercises with muscle mappings, movement type, equipment, default reps, execution cues, rest periods.
- `base_program.json` — the balanced 3-day Upper/Lower/Upper split (the schedule you already run).
- `specialization_rules.json` — per-muscle add/reduce/cap rules with MEV/MAV/MRV landmarks.

---

## 1. What the product is (and what "specialize" actually does)

A structured training tracker built on one opinionated base program with an optional **specialization layer**. The base is your 3-day split. Specialization is the differentiator, and it is **not** "show me more exercises." Picking a muscle **rewrites the program**:

1. **Adds** direct sets for the chosen muscle (new slots, tinted as "added").
2. **Reduces** sets on an already-strong or recovery-competing muscle, so total fatigue stays manageable.
3. **Caps** the muscle's weekly volume below its MRV so it can never become junk volume.
4. **Frames it as an 8-week block** with a reassess prompt at the end.

So choosing "biceps" doesn't just surface curls — it takes you from 3 → 10 weekly biceps sets, drops chest-supported row 3 → 2, and shows you the new full program. That distinction is the heart of the app.

### Three design principles

1. **Opinionated default** — no blank-slate program builder. Start on the proven base, adjust. (Same philosophy as DoNext's weighted random task picker: remove decision paralysis.)
2. **Logging speed first** — set entry on a phone, mid-set, sweaty hands, must be near-instant.
3. **Proof of progress** — the payoff is a mirror showing whether lifts are going up.

### DoNext integration (reuse, don't rebuild)

- A finished workout writes a **focus-time entry** and counts toward the **Body 💪 pillar** → shows up in existing weekly stats automatically.
- Each scheduled training day can surface as a **habit** ("Train — Upper Push") → streaks/completion reuse existing logic.
- The shareable weekly **report card** gains a gym section: sessions hit, top lifts, new PRs.

---

## 2. Data model

All tables `user_id`-scoped, RLS `user_id = auth.uid()` (copy existing DoNext policy pattern). Weight **always stored in kg**; unit preference is display-only. Weight and reps are **separate numeric fields** — this structurally eliminates the "12, 15 became a date" corruption class from the spreadsheet.

```
gym_exercises            -- catalog (global seed rows: user_id NULL; custom: user_id set)
  id, user_id?, name, primary_muscle, secondary_muscles[], movement_type,
  equipment, is_unilateral, default_rep_low, default_rep_high,
  execution_cue, rest_seconds

gym_programs             -- one active per user; others archived
  id, user_id, name, base_template, specialization_muscle?, spec_started_on?,
  status(active|archived), started_at, deload_interval_weeks(=7), created/updated

gym_program_days         -- the 3 days
  id, program_id, label, day_order, default_weekday?

gym_program_exercises    -- the generated slots (base + specialization injections)
  id, program_day_id, exercise_id, slot_order, target_sets,
  target_rep_low, target_rep_high, is_specialization(bool), notes?

gym_sessions             -- one logged workout (the fact table)
  id, user_id, program_day_id?, performed_at(date), bodyweight_kg?,
  duration_min?, is_deload(bool), notes?, created_at

gym_set_logs             -- individual sets (highest volume; keep lean)
  id, session_id, exercise_id, set_number, weight_kg, reps, rir?,
  is_warmup(bool), created_at
```

**Indexes:** `gym_set_logs(session_id)`, `gym_set_logs(exercise_id, created_at)` (per-exercise progress), `gym_sessions(user_id, performed_at)` (calendar/streak), `gym_program_exercises(program_day_id, slot_order)`.

---

## 3. The generator (pure function, the program engine)

`generateProgram(baseProgram, specializationMuscle | null, rules) → { days, slots[] }`

1. Deep-copy base days.
2. If a muscle is given: apply its `reduce` list (lower matching slots to `sets_to`, floor 1, skip if absent), then append its `add` list as new slots with `is_specialization = true`.
3. Recompute the target muscle's weekly direct sets; **assert ≤ `weekly_cap_sets`**; fail loudly if a future rule edit would exceed it.
4. **Idempotent:** always regenerate from base, never mutate in place. base → specialize → reset → re-specialize yields identical output, no duplicate slots.

Lives in `src/gym/lib/generateProgram.js`, pure and unit-tested. Persisting the result = delete existing `gym_program_exercises` for the program and insert the generated slots in a transaction (Edge Function or RPC).

Validated already: all 11 specializations land in their MAV zone, none breaches cap (biceps 10/22, triceps 9/18, chest 15/20, back 17/24, side delts 13/26, rear delts 9/22, quads 10/20, hams 9/18, calves 9/18, abs 9/20, forearms 5/16).

---

## 4. Routes & navigation

Rendered in the existing `AppShell`/`BottomNav` (add a dumbbell tab, or nest under the Body pillar).

```
/gym                  Home — today / next workout
/gym/log/:sessionId   Active logging (the make-or-break screen)
/gym/program          Program view + specialization picker
/gym/history          Calendar + session list
/gym/progress         Charts: per-exercise 1RM, per-muscle volume, bodyweight, PRs
/gym/exercises        Browsable exercise library (+ add custom)
/gym/onboarding       First-run setup
```

---

## 5. Screen specifications

### 5.1 `/gym/onboarding` (first run)

One screen, three steps, skippable to defaults:

1. **Confirm the base program.** "You'll train 3 days a week: Upper, Lower, Upper. Here's the split." Show the 3 day labels with exercise counts. Primary button: **Start program**.
2. **Optional specialization.** "Want to prioritize one muscle? You can add or change this anytime." A muscle grid (see 5.3) + a clear **Skip — keep it balanced**.
3. **Units & schedule.** kg/lb toggle (default kg), and pick weekdays for the 3 days (default Mon/Wed/Fri).

On finish: create `gym_programs` row, run the generator, insert `gym_program_days` + `gym_program_exercises`. Route to `/gym`.

### 5.2 `/gym` (home — opens 4×/week, answer "what now?" in one glance)

- **Hero card:** next scheduled workout (label + exercise count) and a large **Start workout** button. If today matches a `default_weekday`, that day is "today"; otherwise show the next one.
- **Last-time line:** "Last Upper Push — 3 days ago. Top: bench 65×13." One-glance context pulled from the most recent matching session.
- **Week strip:** three dots (done / today / upcoming) mirroring DoNext habit dots.
- **Specialization banner** (if active): "Biceps block — week 3 of 8" + thin progress bar. Tap → `/gym/program`.
- **Deload nudge** when `weeks_since_start % deload_interval_weeks == 0`: "Deload week — drop to ~60%, half the sets."

Tapping **Start workout** creates a `gym_sessions` row for that `program_day_id` and routes to `/gym/log/:sessionId`.

### 5.3 `/gym/program` (program view + specialization — the part that was unclear)

**Top:** program name, current specialization state ("Balanced" or "Specializing: Biceps — week 3 of 8").

**Body:** the 3 days, each a card listing its slots: exercise name, target sets × rep range, and the execution cue on tap. **Specialization-added slots are tinted** (the teal we used) and labeled "added for biceps." Reduced slots show a subtle "↓ trimmed for recovery" note.

**Specialization picker** (button "Change focus" → modal):

- A grid of muscles (chest, back, side delts, rear delts, biceps, triceps, quads, hamstrings, calves, abs, forearms) — only those with a rule entry. Optionally a simple body-map graphic; a labeled grid is enough for v1.
- Selecting one opens a **confirmation preview** that states exactly what changes, read from the rule:
  > **Specialize: Biceps**
  > • Adding: Incline DB curl (3 sets), Hammer curl (2 sets) on Day 1; Cable curl (2 sets) on Day 3
  > • Trimming: Chest-supported row 3 → 2 sets (back is already high-volume)
  > • Biceps goes from 3 → 10 sets/week (cap 22)
  > • Recommended block: 8 weeks, then reassess
  > [Confirm] [Cancel]
- **Confirm** → run generator, persist new slots, set `specialization_muscle` + `spec_started_on`, toast "Biceps block started."
- **"Return to balanced"** button when a specialization is active → regenerate from base, clear the fields.
- **One muscle at a time, enforced** — selecting a new one replaces the old (with a confirm). This constraint *is* the feature.

**Per-slot edit** (tap a slot → sheet): change sets, change rep range, or **swap exercise**. Swap opens the library filtered to the **same `primary_muscle`** (and same `movement_type` by default) so swaps preserve the training intent — this is the "alternatives" logic, driven by the catalog, not a hardcoded list.

**Block tracking:** `spec_started_on` drives "week N of 8." At week 8, home shows a reassess prompt: keep / switch / return to balanced.

### 5.4 `/gym/log/:sessionId` (active logging — optimize ruthlessly)

The screen the product lives or dies on.

- Day's exercises as collapsible cards in `slot_order`. Header shows name + target "3 × 8–10" + a tap-for-cue info dot.
- **Per set row:** weight field, reps field, optional RIR pill (0/1/2/3), check to log.
- **Last-session prefill:** each set pre-fills last time's weight × reps as a **ghost placeholder**. Tap-to-accept logs the same; steppers nudge ±. Biggest speed win — most sets repeat or increment slightly.
- **Numeric-only inputs**, big tap targets, numeric keypad on focus. Weight stepper increments sensibly (2.5 kg barbell, 1–2 kg per dumbbell, machine pin). No free text where a stepper works.
- **Rest timer** auto-starts on set log, seeded from the exercise's `rest_seconds`; PWA notification on finish (request permission once; degrade to in-app sound on iOS). Skippable/adjustable.
- **Specialization slots tinted**, so the user sees what's "extra."
- **Autosave every set** to `gym_set_logs`; offline writes queue (see §7). Never block the UI on the network.
- **Bodyweight field** at top, prefilled from last entry, optional.
- **Add set / drop set** per exercise on the fly (logs reality, not just the plan).
- **Finish** → write `duration_min` (timer from start), create the DoNext focus entry, mark the day's habit done, route to a short summary (total volume, any PRs hit, "vs last time" deltas).

### 5.5 `/gym/history`

- **Month calendar**, dots on trained days colored by day type. Streak count.
- Tap a day → session detail: every set, total volume (Σ weight×reps), bodyweight, notes, duration.
- List view fallback for fast scroll. Filter by day type.

### 5.6 `/gym/progress` (the mirror — Recharts, already in stack)

Tabs:

- **Per-exercise** — dropdown to pick an exercise; line chart of **estimated 1RM** over time (Epley: `weight × (1 + reps/30)`) plus top-set weight. This answers "are my biceps catching up?" Comparing 60×12 vs 65×8 needs a common metric; 1RM gives it.
- **Per-muscle weekly volume** — stacked bars of hard sets/week per muscle, the specialized muscle highlighted, with faint MEV/MAV/MRV guide lines from the landmarks table so the user sees if they're in range.
- **Bodyweight** — line + 7-day moving average (same calc as the spreadsheet).
- **Consistency** — sessions/week vs the 3-session goal; current + longest streak.
- **PR feed** — auto-detected: heaviest weight, best estimated 1RM, most reps at a given load, per exercise. PRs also surface in the finish summary and the weekly report card.

### 5.7 `/gym/exercises` (library — this one *is* just a list, by design)

- Searchable, filterable by muscle / equipment / movement type.
- Each row: name, primary + secondary muscles, default rep range, equipment; tap for the execution cue.
- **Add custom exercise** → writes a `gym_exercises` row with the user's `user_id` (must set `primary_muscle` so it's swap- and specialization-eligible).

---

## 6. API surface (Supabase)

Mostly direct table reads/writes through the client with RLS. Three operations warrant an Edge Function / RPC for atomicity:

- `rpc_apply_program(program_id, specialization_muscle|null)` — runs the generator server-side (or validates a client-generated payload), replaces `gym_program_exercises` in a transaction, updates the program row. Enforces the cap server-side too.
- `rpc_finish_session(session_id, duration_min)` — writes duration, creates the linked focus entry, marks the habit, returns PR deltas. One transaction so a finished workout is always consistent.
- `rpc_detect_prs(exercise_id)` — optional; PRs can also be computed client-side from `gym_set_logs`. Server-side keeps it canonical for the report card.

Everything else (log a set, read history, charts) is plain RLS-scoped queries.

---

## 7. Offline & PWA

Logging happens in gyms with bad signal — offline is mandatory, not optional.

- **Optimistic local writes:** set logs hit local state instantly, then sync. Outbox queue in IndexedDB (Dexie or `idb-keyval`); flush on reconnect. Last-write-wins per set is fine (sets are append-only in practice).
- The Vite PWA service worker already caches the app shell; add a runtime cache for the exercise catalog (rarely changes).
- **PWA notifications** for the rest timer (permission once, first workout). iOS PWA notification limits → graceful fallback to in-app timer + sound.

---

## 8. Build order (each phase ships and is usable alone)

**Phase 0 — Schema & seed.** Migrations for all `gym_*` tables + RLS. Seed `gym_exercises` from `exercise_catalog.json`. Load `base_program.json` and `specialization_rules.json` as app constants. *(Data files done.)*

**Phase 1 — Program create + view.** `/gym/onboarding`, the generator function (+ unit tests for idempotency and caps), `/gym/program` read-only. **Ship:** you can create your program in the app.

**Phase 2 — Logging (core).** `/gym` home, `/gym/log/:sessionId` with last-session prefill, steppers, autosave, rest timer, finish flow → focus entry + habit. **Ship:** it replaces the spreadsheet. Use it yourself 2 weeks before building charts.

**Phase 3 — Progress & history.** `/gym/history` calendar + detail, `/gym/progress` (start with per-exercise 1RM + bodyweight; add volume bars + PRs next). **Ship.**

**Phase 4 — Specialization UX + integration.** The picker modal with the change-preview, block tracking ("week N of 8"), reassess prompt, per-slot swap, gym section in the weekly report card. **Ship.**

**Phase 5 — Later, only if used.** Plate calculator, exercise demo links/GIFs, supersets, CSV import (bring your existing tracker data in), Telegram "log from chat" hook (fits your bot work), lb display.

---

## 9. Scope discipline (what v1 is NOT)

No social feed, no AI form check, no video, no nutrition/macro tracking, no multiple concurrent programs, no coach/student multi-user. The base program + a real specialization layer + fast logging + honest progress charts is a complete, useful product. Ship that, run a full 12-week block on it yourself, let real usage decide the rest.

---

## 10. First concrete step

Phase 0: write the migration for `gym_exercises` + `gym_set_logs` with RLS, seed the catalog from the JSON. Then Phase 1's generator has tables to point at. The generator's unit test (base → specialize biceps → assert biceps = 10 sets and row = 2 sets → reset → assert back to base) is the first test to write — it locks in the behavior that was unclear and the whole specialization feature depends on it.
```
