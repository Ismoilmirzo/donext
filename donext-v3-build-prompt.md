# DONEXT v3 — Full Build Specification

You are building **DoNext**, a web app with two core systems: **Habits** (daily recurring checkboxes) and **Projects & Tasks** (goal-oriented work with a randomized task picker that eliminates decision paralysis). The app tracks focus time and presents rich visual analytics.

---

## TECH STACK

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS (dark mode only)
- **Charts:** Recharts (line charts, bar charts, pie charts, area charts)
- **Backend & Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Hosting:** Vercel (frontend), Supabase (backend)
- **Routing:** React Router v6
- **State Management:** React Context + hooks
- **Date handling:** date-fns
- **Icons:** lucide-react

---

## THE TWO SYSTEMS

### System 1: Habits

Habits are small, recurring actions the user wants to do every single day. They never change day-to-day — they're the same checklist. The user simply opens the app and ticks off what they did today.

**Examples:** "Read 30 min", "Exercise", "Drink 2L water", "No social media before noon", "Meditate", "Journal"

**Key properties:**
- A habit is either done (✓) or not done for a given day. Binary. No scores, no ratings.
- Habits persist indefinitely until the user archives/deletes them.
- The user can add new habits or archive old ones anytime.
- Analytics show completion rates as weekly and monthly charts with percentages.

### System 2: Projects & Tasks

Projects are goal-oriented containers (e.g., "Build DoNext MVP", "Learn Dynamic Programming", "Prepare IOAI students"). Each project contains an ordered list of tasks — concrete steps toward completing the project.

**Key properties:**
- Tasks within a project are ordered (the user defines the order = order of completion).
- Tasks are NOT scheduled to specific times or days. There's no calendar.
- There are no "pillars" or "dimensions" — projects exist independently.
- When the user wants to work, they hit **"Start a Task"** and a random project is chosen for them. The app shows the next incomplete task from that project.
- The user can re-roll **once** if they don't want that project right now.
- The user can also manually browse and pick a specific project/task, but the random picker is the default and prominent option.
- When a task is completed, the user logs approximate time spent (hours:minutes).
- When all tasks in a project are done, the user can either mark the project as finished or add new tasks.
- If a project has all tasks completed but the user neither finishes it nor adds new tasks within 3 days, an automatic "Review this project and add next steps" task is added.

---

## DATABASE SCHEMA

```sql
-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'Asia/Tashkent',
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own profile" ON profiles FOR ALL USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. HABITS
-- ============================================
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '✓',
  color TEXT DEFAULT '#10B981',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,       -- false = archived
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_habits_user ON habits(user_id);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own habits" ON habits FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. HABIT LOGS (one row per habit per day)
-- ============================================
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, date);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own habit_logs" ON habit_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  completed_at TIMESTAMPTZ,
  all_tasks_done_at TIMESTAMPTZ,  -- timestamp when last task was completed
                                   -- used to trigger auto-review after 3 days
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(user_id, status);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. TASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,             -- defines completion order within project
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_auto_generated BOOLEAN DEFAULT false,  -- true for "review project" auto-tasks
  time_spent_minutes INT,               -- logged by user on completion
  started_at TIMESTAMPTZ,               -- when user tapped "Start"
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. FOCUS SESSIONS (logged when a task is completed)
-- ============================================
-- This is a denormalized log for fast analytics queries.
-- Every completed task also creates a focus_session.
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  duration_minutes INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_focus_user_date ON focus_sessions(user_id, date);
CREATE INDEX idx_focus_project ON focus_sessions(project_id);
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
```

---

## FILE STRUCTURE

```
donext/
├── public/
│   ├── manifest.json
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   │
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── dates.js              # Week/month boundary helpers
│   │   └── random.js             # Project selection algorithm
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx
│   │
│   ├── hooks/
│   │   ├── useProfile.js
│   │   ├── useHabits.js          # CRUD habits + logs
│   │   ├── useProjects.js        # CRUD projects
│   │   ├── useTasks.js           # CRUD tasks within a project
│   │   ├── useFocusSessions.js   # Focus time analytics
│   │   └── useStats.js           # Aggregated stats for charts
│   │
│   ├── pages/
│   │   ├── LandingPage.jsx       # Public marketing page
│   │   ├── AuthPage.jsx          # Login / Signup
│   │   ├── HabitsPage.jsx        # Daily habit checkboxes + charts
│   │   ├── ProjectsPage.jsx      # List all projects, create new
│   │   ├── ProjectDetailPage.jsx # View/edit tasks within a project
│   │   ├── FocusPage.jsx         # "Start a Task" random picker + work screen
│   │   ├── StatsPage.jsx         # All analytics and infographics
│   │   └── SettingsPage.jsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx      # Nav wrapper for authenticated pages
│   │   │   ├── BottomNav.jsx     # Mobile tabs
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── habits/
│   │   │   ├── HabitCheckbox.jsx     # Single habit row with today's checkbox
│   │   │   ├── HabitList.jsx         # Full daily checklist
│   │   │   ├── AddHabitModal.jsx     # Create new habit
│   │   │   ├── HabitWeeklyChart.jsx  # 7-day bar chart per habit
│   │   │   ├── HabitMonthlyGrid.jsx  # GitHub-style monthly heatmap
│   │   │   ├── HabitStreakCard.jsx   # Current + longest streak
│   │   │   └── HabitStatsCard.jsx    # Completion % (week/month/all-time)
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectCard.jsx       # Project in list view
│   │   │   ├── CreateProjectModal.jsx
│   │   │   ├── TaskRow.jsx           # Single task in project detail
│   │   │   ├── AddTaskModal.jsx
│   │   │   ├── ReorderableTasks.jsx  # Drag or arrow buttons to reorder
│   │   │   └── ProjectStatusBadge.jsx
│   │   │
│   │   ├── focus/
│   │   │   ├── StartTaskButton.jsx   # Big "Start a Task" CTA
│   │   │   ├── RandomProjectCard.jsx # Shows the randomly selected project + task
│   │   │   ├── ActiveTaskScreen.jsx  # Working screen with timer
│   │   │   ├── CompleteTaskModal.jsx # "How long did you spend?" input
│   │   │   └── RerollButton.jsx      # One-time re-roll
│   │   │
│   │   ├── stats/
│   │   │   ├── FocusTimeChart.jsx    # Weekly/monthly focus hours
│   │   │   ├── ProjectProgressChart.jsx  # Per-project completion
│   │   │   ├── DailyFocusBar.jsx     # Hours per day bar chart
│   │   │   ├── WeeklyOverviewCard.jsx
│   │   │   ├── MonthlyOverviewCard.jsx
│   │   │   └── AllTimeStatsCard.jsx
│   │   │
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── TextArea.jsx
│   │       ├── Card.jsx
│   │       ├── Modal.jsx
│   │       ├── LoadingSpinner.jsx
│   │       ├── EmptyState.jsx
│   │       ├── ProgressBar.jsx
│   │       ├── TimeInput.jsx         # Hours:Minutes input component
│   │       └── ColorPicker.jsx       # For project colors
│   │
│   └── styles/
│       └── globals.css
│
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.local
```

---

## DESIGN SYSTEM

### Colors

```
Background:        #0F172A  (slate-900)
Surface:           #1E293B  (slate-800)
Surface elevated:  #334155  (slate-700)
Border:            #475569  (slate-600)
Text primary:      #F8FAFC  (slate-50)
Text secondary:    #94A3B8  (slate-400)
Text muted:        #64748B  (slate-500)

Accent (primary):  #10B981  (emerald-500)  — CTAs, success, completed
Accent hover:      #059669  (emerald-600)
Danger:            #EF4444  (red-500)
Warning:           #F59E0B  (amber-500)
Info:              #3B82F6  (blue-500)

Habit default:     #10B981  (emerald)
Chart colors:      #6366F1 (indigo), #F59E0B (amber), #10B981 (emerald),
                   #EF4444 (red), #EC4899 (pink), #3B82F6 (blue),
                   #8B5CF6 (violet), #14B8A6 (teal)

Project colors (user picks one on creation):
  #6366F1, #F59E0B, #10B981, #EF4444, #EC4899,
  #3B82F6, #8B5CF6, #14B8A6, #F97316, #84CC16
```

### Typography
- Font: `Inter` from Google Fonts
- Stat numbers: `font-mono text-3xl font-bold` (tabular for alignment)
- Section headings: `text-lg font-semibold text-slate-50`
- Body: `text-sm text-slate-300`
- Muted/labels: `text-xs text-slate-500 uppercase tracking-wide`

### Component Patterns
- Cards: `rounded-xl bg-slate-800 border border-slate-700 p-4 sm:p-6`
- Primary button: `bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg px-6 py-3 transition-colors`
- Secondary button: `bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg px-4 py-2`
- Ghost button: `text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg px-3 py-2`
- Checkbox (habit): `w-6 h-6 rounded-md border-2 border-slate-600 checked:bg-emerald-500 checked:border-emerald-500 transition-all` — with a satisfying scale animation on check
- Input: `bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-50 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500`

### Navigation (Bottom tabs on mobile, sidebar on desktop)
4 tabs:
1. **Habits** (icon: CheckSquare) — daily checkboxes + habit analytics
2. **Projects** (icon: FolderKanban) — project list + management
3. **Focus** (icon: Zap) — "Start a Task" random picker + active work
4. **Stats** (icon: BarChart3) — all infographics and analytics

---

## SCREEN-BY-SCREEN SPECIFICATIONS

---

### PAGE 1: Landing Page (`/`)

Redirect to `/habits` if authenticated. Otherwise show:

```
[Logo: "DoNext"]

Headline: "Stop overthinking. Start doing."

Subheadline: "Track your daily habits. Let the app pick your next task. 
See your progress in beautiful charts."

[Get Started Free →]
[Already have an account? Log in]

--- 3 features ---

1. "Daily Habits" — Check off your habits every day. See weekly 
   and monthly completion rates at a glance.

2. "Random Task Picker" — Can't decide what to work on? Hit one 
   button and we'll choose for you. All projects get fair coverage.

3. "Focus Analytics" — See exactly where your time goes. Weekly 
   charts, monthly trends, project breakdowns.
```

---

### PAGE 2: Auth Page (`/auth`)

Same as previous spec: centered card, Sign Up / Log In tabs, email+password, Google OAuth, forgot password. On first login, redirect to `/habits` (no complex onboarding — the app is self-explanatory).

---

### PAGE 3: Habits Page (`/habits`) — THE DAILY HOME SCREEN

This is the default page users see when they open the app. Two sections: today's checklist at top, then analytics below.

```
┌──────────────────────────────────────┐
│  Today · Tuesday, Mar 10             │
│  ───────────────────────────────     │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ ☑  Read 30 min               │    │ ← checked (green bg tint)
│  ├──────────────────────────────┤    │
│  │ ☐  Exercise                  │    │ ← unchecked
│  ├──────────────────────────────┤    │
│  │ ☑  Drink 2L water            │    │
│  ├──────────────────────────────┤    │
│  │ ☐  No social media til noon  │    │
│  ├──────────────────────────────┤    │
│  │ ☑  Journal                   │    │
│  └──────────────────────────────┘    │
│                                      │
│  Today: 3/5 (60%)                    │
│  ████████████░░░░░░░░  60%           │
│                                      │
│  [+ Add Habit]                       │
│                                      │
│  ═══════════════════════════════     │
│                                      │
│  This Week                           │
│  ┌──────────────────────────────┐    │
│  │  [Weekly Bar Chart]          │    │
│  │                              │    │
│  │  M   T   W   T   F   S   S  │    │
│  │  █   █   █   ░   ░   ░   ░  │    │
│  │  80% 60% 100%                │    │
│  │                              │    │
│  │  Week average: 80%           │    │
│  └──────────────────────────────┘    │
│                                      │
│  This Month                          │
│  ┌──────────────────────────────┐    │
│  │  [Monthly Heatmap Grid]      │    │
│  │                              │    │
│  │  1  2  3  4  5  6  7         │    │
│  │  ██ ██ ██ ██ ░░ ██ ██        │    │
│  │  8  9  10 11 12 13 14        │    │
│  │  ██ ██ ░░ ...                │    │
│  │                              │    │
│  │  March: 78% · 22/28 days    │    │
│  │  Streak: 🔥 6 days           │    │
│  └──────────────────────────────┘    │
│                                      │
│  Per-Habit Breakdown                 │
│  ┌──────────────────────────────┐    │
│  │ Read 30 min    ██████████ 92%│    │
│  │ Exercise       ████████░░ 78%│    │
│  │ Drink 2L water █████████░ 85%│    │
│  │ No social media██████░░░░ 64%│    │
│  │ Journal        ███████░░░ 71%│    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Habit checkbox behavior:**
- Tapping a checkbox immediately toggles it and saves to DB (optimistic update).
- Checked = `habit_logs` row with `completed: true`. Unchecked = row with `completed: false` (or no row — treat missing as false).
- Use upsert on `(habit_id, date)`.
- On check: checkbox fills with emerald-500, subtle scale animation (0.9 → 1.1 → 1.0 over 200ms).
- On uncheck: checkbox empties, no animation.

**Habit checkbox implementation:**
```javascript
async function toggleHabit(habitId, date, currentValue) {
  const newValue = !currentValue;
  // Optimistic update in UI
  setHabitLogs(prev => ({ ...prev, [`${habitId}-${date}`]: newValue }));
  
  // Upsert to DB
  await supabase.from('habit_logs').upsert({
    user_id: user.id,
    habit_id: habitId,
    date: date,
    completed: newValue,
  }, { onConflict: 'habit_id,date' });
}
```

**Add Habit modal:**
```
Title: [text input, required]
Icon:  [optional emoji picker or text field, default "✓"]
       (simple: just let them type an emoji)

[Save Habit]
```

New habits get `sort_order = max existing + 1`. Users can reorder habits by drag (or up/down arrow buttons for simplicity in MVP).

**Long-press / swipe on a habit row** (or a ⋯ menu button) shows:
- Edit (rename)
- Archive (sets `is_active = false`, disappears from daily list, keeps historical data)
- Delete (with confirmation — permanently removes habit + all logs)

**Weekly bar chart (HabitWeeklyChart):**
- 7 bars, one per day (Mon–Sun)
- Bar height = (habits completed / total active habits) × 100
- Bar color: <50% red-500, 50-79% amber-500, 80%+ emerald-500
- Label below each bar: day letter (M, T, W, T, F, S, S)
- Label above each bar: percentage
- Show current day's bar with a subtle glow/border
- Below chart: "Week average: X%"

**Monthly heatmap grid (HabitMonthlyGrid):**
- Calendar-style grid for the current month
- Each cell = one day
- Cell color intensity based on completion rate:
  - 0%: slate-700 (dark, empty)
  - 1-49%: emerald-900 (faint)
  - 50-79%: emerald-700 (medium)
  - 80-99%: emerald-500 (bright)
  - 100%: emerald-400 (brightest, with slight glow)
- Future days: slate-800 with dashed border
- Below grid: "March: 78% · 22/28 days"
- Streak counter: "🔥 6 days" (consecutive days with ≥80% habits done)

**Per-habit breakdown (HabitStatsCard):**
- Horizontal progress bars, one per active habit
- Shows completion rate for current month
- Sorted by completion rate (highest first)
- Bar color: that habit's color (or emerald by default)

**Streak calculation:**
```javascript
function calculateStreak(habitLogs, activeHabitCount, today) {
  let streak = 0;
  let date = today;
  
  while (true) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLogs = habitLogs.filter(l => l.date === dateStr && l.completed);
    const completionRate = dayLogs.length / activeHabitCount;
    
    // A "streak day" = at least 80% of habits completed
    if (completionRate >= 0.8) {
      streak++;
      date = subDays(date, 1);
    } else {
      break;
    }
  }
  return streak;
}
```

---

### PAGE 4: Projects Page (`/projects`)

Lists all active projects with their progress.

```
┌──────────────────────────────────────┐
│  Projects                            │
│                                      │
│  [+ New Project]                     │
│                                      │
│  Active (3)                          │
│  ┌──────────────────────────────┐    │
│  │ ● Build DoNext MVP         │    │
│  │   ████████░░░░  5/8 tasks    │    │
│  │   Last worked: 2 hours ago   │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ ● Learn Dynamic Programming  │    │
│  │   ██████░░░░░░  3/7 tasks    │    │
│  │   Last worked: Yesterday     │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ ● Prepare IOAI Students     │    │
│  │   ██░░░░░░░░░░  1/6 tasks    │    │
│  │   Last worked: 3 days ago    │    │
│  │   ⚠️ Needs review            │    │ ← has auto-generated review task
│  └──────────────────────────────┘    │
│                                      │
│  Completed (2)                       │  ← collapsed by default
│  ┌──────────────────────────────┐    │
│  │ ✓ Set up development env     │    │
│  │   Completed Mar 5 · 4.5 hrs  │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Project card (ProjectCard) shows:**
- Color dot (left edge or left border accent) in project color
- Project title
- Progress bar: completed tasks / total tasks
- "Last worked: X" — relative time since last task completion in this project
- If project has an auto-generated review task: show "⚠️ Needs review" badge
- Tap → navigates to `/projects/:id` (ProjectDetailPage)

**Create Project modal (CreateProjectModal):**
```
Title: [text input, required]
Description: [textarea, optional]
Color: [row of 10 color circles to pick from]

[Create Project]
```

**Completed projects section:**
- Collapsed by default (tap to expand)
- Shows project title, completion date, total focus time
- Can be "Reopened" (sets status back to 'active') or permanently archived

---

### PAGE 5: Project Detail Page (`/projects/:id`)

Shows a single project with its ordered task list.

```
┌──────────────────────────────────────┐
│  [← Back]              [⋯ Menu]     │
│                                      │
│  ● Build DoNext MVP               │
│  "Ship the first version by April"  │
│                                      │
│  Progress: 5/8 tasks                 │
│  █████████████░░░░░░░░  62%         │
│  Total focus time: 12h 30m           │
│                                      │
│  ───────────────────────────────     │
│                                      │
│  Tasks (in order)                    │
│                                      │
│  1. ✅ Set up Supabase schema        │  ← completed, strikethrough
│  │      1h 15m · Mar 7               │     time spent + date
│  │                                   │
│  2. ✅ Build auth flow               │
│  │      2h 00m · Mar 8               │
│  │                                   │
│  3. ✅ Create habit system UI        │
│  │      3h 30m · Mar 8               │
│  │                                   │
│  4. ✅ Build habit analytics          │
│  │      1h 45m · Mar 9               │
│  │                                   │
│  5. ✅ Create projects CRUD           │
│  │      2h 00m · Mar 10              │
│  │                                   │
│  6. ○ Build focus/random picker   ← │  ← NEXT (highlighted)
│  │                                   │     slightly larger, accent border
│  7. ○ Build stats page               │
│  │                                   │
│  8. ○ Deploy + test                  │
│                                      │
│  [+ Add Task]                        │
│                                      │
│  ─── Project actions ───             │
│  [✓ Mark Project Complete]           │  ← only shows when all tasks done
│  [Archive Project]                   │
│                                      │
└──────────────────────────────────────┘
```

**Task list behavior:**
- Tasks displayed in `sort_order` (defines completion sequence)
- Completed tasks: show ✅, strikethrough title, show time spent + completion date, muted colors
- First pending task: highlighted with emerald-500 left border and slightly elevated card style — this is "next up"
- Other pending tasks: normal style, dimmer
- Users can reorder PENDING tasks via up/down arrow buttons (or drag). Completed tasks are locked in position.
- Tapping a pending task does nothing from this screen (you start tasks from the Focus page). But tapping shows a small tooltip: "Go to Focus tab to start working on this."

**Add Task modal:**
```
Title: [text input, required]
Description: [textarea, optional]

[Add to End]  or  [Add After Current Task]
```

"Add to End" = highest sort_order + 1.
"Add After Current Task" = inserts after the first pending task, reorders subsequent tasks.

**⋯ Menu options:**
- Edit project (title, description, color)
- Archive project (hides from active list, keeps data)
- Delete project (confirmation required, deletes all tasks + focus sessions)

**"Mark Project Complete" button:**
- Only visible when all tasks in the project have status 'completed'
- Sets `projects.status = 'completed'` and `projects.completed_at = now()`
- Shows a celebration: "🎉 Project complete! Total focus time: Xh Ym across Z sessions"

**Auto-review task logic:**
```javascript
// Run on every app load or on a periodic check
async function checkForStaleProjects(userId) {
  const { data: projects } = await supabase
    .from('projects')
    .select('*, tasks(*)')
    .eq('user_id', userId)
    .eq('status', 'active');

  const now = new Date();
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

  for (const project of projects) {
    const pendingTasks = project.tasks.filter(t => t.status === 'pending');
    const hasAutoReview = project.tasks.some(
      t => t.is_auto_generated && t.status === 'pending'
    );

    // All tasks completed (or no pending non-auto tasks), no auto-review exists yet
    if (pendingTasks.length === 0 && !hasAutoReview && project.all_tasks_done_at) {
      const timeSinceAllDone = now - new Date(project.all_tasks_done_at);
      if (timeSinceAllDone >= THREE_DAYS) {
        // Insert auto-generated review task
        const maxOrder = Math.max(...project.tasks.map(t => t.sort_order), 0);
        await supabase.from('tasks').insert({
          user_id: userId,
          project_id: project.id,
          title: `Review "${project.title}" and add next steps`,
          description: 'All previous tasks are done. Analyze where this project stands and add new tasks to keep making progress, or mark the project as complete.',
          sort_order: maxOrder + 1,
          status: 'pending',
          is_auto_generated: true,
        });
      }
    }
  }
}
```

**Updating `all_tasks_done_at`:**
When a task is completed, check if it was the last pending task:
```javascript
async function onTaskComplete(taskId, projectId) {
  // ... mark task completed ...
  
  // Check if all tasks in project are now completed
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'pending');
  
  if (count === 0) {
    await supabase.from('projects')
      .update({ all_tasks_done_at: new Date().toISOString() })
      .eq('id', projectId);
  }
}
```

---

### PAGE 6: Focus Page (`/focus`) — THE CORE EXPERIENCE

This page has 3 states.

**State A: Ready to Work (default — no task in progress)**

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│           ⚡                          │
│                                      │
│    Ready to make progress?           │
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │     🎲 Start a Task          │    │  ← BIG button, emerald,
│  │                              │    │     centered, impossible to miss
│  └──────────────────────────────┘    │
│                                      │
│  or pick manually                    │  ← small text link below
│                                      │
│  ───────────────────────────────     │
│                                      │
│  Today's Focus                       │
│  2h 45m across 3 sessions            │
│  ████████████████░░░░                │
│                                      │
│  Recent:                             │
│  ✓ Build auth flow (2h) — DoNext  │
│  ✓ Solve 2 DP problems (45m) — DP  │
│                                      │
└──────────────────────────────────────┘
```

Below the big button, "or pick manually" is a text link that expands an inline dropdown/list of active projects, each showing their next task. Tapping one starts that specific task.

**"Start a Task" random selection algorithm:**
```javascript
function selectRandomProject(projects, focusSessions) {
  // Only consider active projects that have pending tasks
  const eligible = projects.filter(p => 
    p.status === 'active' && 
    p.tasks.some(t => t.status === 'pending')
  );
  
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  // Weight by "staleness" — projects worked on least recently get higher weight
  // This ensures all projects get coverage
  const now = new Date();
  const weights = eligible.map(project => {
    const lastSession = focusSessions
      .filter(s => s.project_id === project.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (!lastSession) return 10; // Never worked on = highest weight
    
    const daysSince = Math.floor(
      (now - new Date(lastSession.date)) / (1000 * 60 * 60 * 24)
    );
    return Math.max(1, daysSince + 1); // At least weight 1
  });

  // Weighted random selection
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < eligible.length; i++) {
    random -= weights[i];
    if (random <= 0) return eligible[i];
  }
  
  return eligible[eligible.length - 1]; // Fallback
}
```

**State B: Project Selected (after tapping "Start a Task")**

Transition animation: card slides up from bottom.

```
┌──────────────────────────────────────┐
│                                      │
│  Your next task is from:             │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ ● Build DoNext MVP         │    │
│  │                              │    │
│  │ Task #6 of 8:                │    │
│  │                              │    │
│  │ "Build focus/random picker"  │    │  ← task title, large font
│  │                              │    │
│  │ Task description if any...   │    │  ← smaller, muted
│  │                              │    │
│  │ ┌────────────┐              │    │
│  │ │  Let's Go ▶│              │    │  ← starts the work session
│  │ └────────────┘              │    │
│  │                              │    │
│  │ 🎲 Pick a different one (1) │    │  ← re-roll, shows "(1)" remaining
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Re-roll behavior:**
- User gets exactly 1 re-roll per "Start a Task" session.
- Tapping "Pick a different one" runs the selection algorithm again, excluding the current project.
- After re-rolling, the button changes to "🎲 Pick a different one (0)" and becomes disabled/greyed out.
- If only 1 eligible project exists, re-roll button is hidden (nothing to re-roll to).

**"Let's Go" button:**
- Sets `tasks.status = 'in_progress'` and `tasks.started_at = now()`
- Transitions to State C (Active Work)

**State C: Working on Task (active session)**

```
┌──────────────────────────────────────┐
│                                      │
│  ● Build DoNext MVP               │  ← project name, muted
│                                      │
│  ───────────────────────────────     │
│                                      │
│  "Build focus/random picker"         │  ← task title, large, centered
│                                      │
│  ⏱  0:45:12                         │  ← elapsed timer, big mono font
│                                      │
│  Focus. Don't switch tasks.          │  ← motivational one-liner
│                                      │
│                                      │
│                                      │
│  ┌──────────────────────────────┐    │
│  │      ✓  I'm Done             │    │  ← emerald, large
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Timer behavior:**
- A simple elapsed-time counter that starts when the user taps "Let's Go".
- Uses `setInterval` updating every second. Display format: `H:MM:SS`.
- The timer is informational only — it does NOT stop the user or create pressure.
- No alerts, no alarms. Just a quiet counter.
- Timer persists if user navigates away and comes back (store `started_at` in DB, calculate elapsed on render).
- A subtle motivational one-liner below the timer, randomly selected from a list:
  - "Focus. Don't switch tasks."
  - "One thing at a time."
  - "You're making progress right now."
  - "Deep work is rare and valuable."
  - "Stay with it."

**"I'm Done" button → CompleteTaskModal:**

```
┌──────────────────────────────────────┐
│                                      │
│  ✓ Nice work!                        │
│                                      │
│  How long did you actually spend?    │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │  2  hrs  │  │  15  min │         │  ← two number inputs
│  └──────────┘  └──────────┘         │
│                                      │
│  Timer says: 2h 23m                  │  ← helpful reference
│  (It's okay if your estimate         │
│   differs — breaks happen!)          │
│                                      │
│  ┌──────────────────────────────┐    │
│  │      Save & Continue          │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Why user inputs time instead of using the timer:**
The timer includes breaks, distractions, bathroom trips. We want actual focused work time. The timer value is shown as a reference, but the user types their real estimate. This makes the focus time data more meaningful.

**On "Save & Continue":**
1. Update `tasks.status = 'completed'`, `tasks.completed_at = now()`, `tasks.time_spent_minutes = hours*60 + minutes`
2. Insert a `focus_sessions` row: `{ user_id, task_id, project_id, date: today, duration_minutes }`
3. Run `onTaskComplete()` to check if all project tasks are done → update `all_tasks_done_at`
4. If all project tasks are now done:
   Show: "🎉 All tasks in [Project Name] are done! [Add More Tasks] or [Complete Project]"
5. If more tasks remain:
   Show: "✓ Task complete! [Start Another Task] or [Done for Now]"
   - "Start Another Task" → back to State A (runs selection again)
   - "Done for Now" → returns to State A idle view

---

### PAGE 7: Stats Page (`/stats`) — INFOGRAPHICS DASHBOARD

All the beautiful charts and numbers. This is the "proof of progress" screen.

```
┌──────────────────────────────────────┐
│  Stats                               │
│                                      │
│  [This Week ▾]  [This Month ▾]      │  ← period selector tabs
│                                      │
│  ═══ FOCUS TIME ═══                  │
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
│  │     12h 45m                  │    │  ← big hero number
│  │     total focus this week    │    │
│  │     (+3h 20m vs last week)   │    │  ← green delta
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
│  Daily Focus Time                    │
│  ┌──────────────────────────────┐    │
│  │  [Bar Chart]                 │    │
│  │                              │    │
│  │  4h ┤                        │    │
│  │  3h ┤      ██                │    │
│  │  2h ┤  ██  ██  ██        ██  │    │
│  │  1h ┤  ██  ██  ██  ██    ██  │    │
│  │  0h ┤──██──██──██──██──░░─██─│    │
│  │      Mon Tue Wed Thu Fri S  S│    │
│  │                              │    │
│  │  Avg: 1h 49m / day          │    │
│  └──────────────────────────────┘    │
│                                      │
│  Focus by Project                    │
│  ┌──────────────────────────────┐    │
│  │  [Pie/Donut Chart]           │    │
│  │                              │    │
│  │      ┌───┐                   │    │
│  │    /  48%  \  DoNext       │    │
│  │   | 30% 22%|  DP / IOAI     │    │
│  │    \      /                  │    │
│  │      └───┘                   │    │
│  │                              │    │
│  │  ● DoNext MVP    6h 10m   │    │
│  │  ● Learn DP        3h 45m   │    │
│  │  ● IOAI Students   2h 50m   │    │
│  └──────────────────────────────┘    │
│                                      │
│  ═══ HABITS ═══                      │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Weekly Completion: 82%      │    │
│  │  ██████████████████░░░░      │    │
│  │                              │    │
│  │  Best habit: Read 30m (95%) │    │
│  │  Needs work: Exercise (60%)  │    │
│  │  Streak: 🔥 6 days           │    │
│  └──────────────────────────────┘    │
│                                      │
│  ═══ PROJECTS ═══                    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Active: 3                   │    │
│  │  Completed this month: 1     │    │
│  │  Tasks completed: 14         │    │
│  │  Avg time per task: 52 min   │    │
│  └──────────────────────────────┘    │
│                                      │
│  Monthly Focus Trend                 │
│  ┌──────────────────────────────┐    │
│  │  [Area Chart - Last 8 weeks] │    │
│  │                              │    │
│  │  20h┤           ╱──╲        │    │
│  │  15h┤      ╱───╱    ╲──     │    │
│  │  10h┤  ╱──╱                  │    │
│  │   5h┤─╱                      │    │
│  │   0h┤───────────────────     │    │
│  │     W1  W2  W3  W4  W5...   │    │
│  │                              │    │
│  │  Trend: +22% vs last month  │    │
│  └──────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**Stats calculations:**

```javascript
// Focus time for a period
async function getFocusStats(userId, startDate, endDate) {
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Group by date for daily bar chart
  const byDate = {};
  sessions.forEach(s => {
    byDate[s.date] = (byDate[s.date] || 0) + s.duration_minutes;
  });

  // Group by project for pie chart
  const byProject = {};
  sessions.forEach(s => {
    byProject[s.project_id] = (byProject[s.project_id] || 0) + s.duration_minutes;
  });

  return { totalMinutes, totalHours, remainingMinutes, byDate, byProject, sessionCount: sessions.length };
}

// Habit stats for a period
async function getHabitStats(userId, startDate, endDate) {
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('completed', true);

  const totalDays = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  const possibleLogs = habits.length * totalDays;
  const completedLogs = logs.length;
  const overallRate = possibleLogs > 0 ? (completedLogs / possibleLogs) * 100 : 0;

  // Per-habit rates
  const perHabit = habits.map(h => {
    const habitLogs = logs.filter(l => l.habit_id === h.id);
    return {
      ...h,
      completionRate: totalDays > 0 ? (habitLogs.length / totalDays) * 100 : 0,
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  return { overallRate, perHabit, totalDays };
}
```

**Chart implementations (all using Recharts):**

1. **Daily Focus Bar Chart:** `<BarChart>` with `<Bar>` for each day. Green bars. Rounded top.
2. **Focus by Project Pie:** `<PieChart>` with `<Pie>` and `<Cell>` colored by project color. Show labels.
3. **Monthly Focus Trend:** `<AreaChart>` with gradient fill (emerald-500 to transparent). Weekly data points.
4. **Habit Weekly Bars:** Same `<BarChart>` pattern. Color-coded by completion rate.

---

### PAGE 8: Settings (`/settings`)

```
Profile
  Display name: [editable]
  Email: [shown]

Habits
  [Manage habits] → opens list where you can reorder, edit, archive
  
Projects
  [View archived projects] → list of archived, can restore

Account
  [Log out]
  [Delete account] (with confirmation)

About
  Version: 1.0
  [Send Feedback]
```

---

## ROUTING

```jsx
<Routes>
  {/* Public */}
  <Route path="/" element={user ? <Navigate to="/habits" /> : <LandingPage />} />
  <Route path="/auth" element={user ? <Navigate to="/habits" /> : <AuthPage />} />

  {/* Protected (wrapped in AppShell with BottomNav) */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppShell />}>
      <Route path="/habits" element={<HabitsPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/focus" element={<FocusPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
  </Route>

  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

---

## BUILD ORDER

### Step 1: Project Setup
- Init Vite + React
- Install: `@supabase/supabase-js`, `react-router-dom`, `date-fns`, `recharts`, `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`
- Configure Tailwind (dark mode, Inter font, custom colors)
- Set up `lib/supabase.js`
- Set up `AuthContext.jsx`
- Set up React Router with all routes
- Create `ProtectedRoute`, `AppShell`, `BottomNav`
- Create base UI components: Button, Input, TextArea, Card, Modal, LoadingSpinner, EmptyState, ProgressBar

### Step 2: Auth
- Build AuthPage (signup/login tabs, Google OAuth)
- Test full auth flow
- Verify profile auto-creation via trigger

### Step 3: Habits — Daily Checklist
- Build HabitList and HabitCheckbox components
- Fetch active habits + today's logs
- Toggle logic with optimistic updates + upsert
- Build AddHabitModal
- Build habit edit/archive/delete (long-press menu or ⋯ button)
- Build reorder capability (up/down arrows)

### Step 4: Habits — Analytics
- Build HabitWeeklyChart (Recharts BarChart, 7 days)
- Build HabitMonthlyGrid (CSS grid heatmap)
- Build HabitStatsCard (per-habit horizontal bars)
- Build HabitStreakCard
- Calculate streak, weekly %, monthly %
- Wire all stats to live data

### Step 5: Projects — CRUD
- Build ProjectsPage with project list
- Build CreateProjectModal
- Build ProjectCard component
- Build ProjectDetailPage with ordered task list
- Build AddTaskModal
- Build task reorder (arrow buttons)
- Implement project status management (complete, archive)

### Step 6: Projects — Auto-Review Task
- Implement `all_tasks_done_at` update on task completion
- Implement `checkForStaleProjects()` on app load
- Auto-insert review task after 3 days
- Show ⚠️ badge on project card

### Step 7: Focus — Random Picker
- Build FocusPage with "Start a Task" big button
- Implement `selectRandomProject()` weighted algorithm
- Build RandomProjectCard (shows selected project + task)
- Implement re-roll (1 attempt, then disabled)
- Build "or pick manually" expandable list

### Step 8: Focus — Active Work Session
- Build ActiveTaskScreen with elapsed timer
- Timer uses `started_at` from DB (persists across page reloads)
- Build motivational one-liners (random rotation)
- Build CompleteTaskModal (hours + minutes input, timer reference)
- Save completion: update task, insert focus_session
- Handle "all tasks done in project" flow
- Handle "Start Another Task" vs "Done for Now"

### Step 9: Stats Page
- Build focus time hero card (total hours + delta)
- Build DailyFocusBar chart (Recharts BarChart)
- Build Focus by Project pie chart (Recharts PieChart)
- Build habit summary card
- Build project summary card
- Build Monthly Focus Trend area chart (Recharts AreaChart)
- Implement period switching (This Week / This Month)

### Step 10: Settings + Polish
- Build SettingsPage
- Mobile responsive pass on all screens
- Loading states for all data fetches
- Empty states for all lists ("No habits yet", "No projects yet", "No focus sessions yet")
- Error handling (failed saves, network issues)
- Smooth page transitions

---

## CRITICAL UX RULES

1. **Habits page is the home screen.** It loads first because it's the thing users do every single day. It must load instantly.
2. **The "Start a Task" button must be impossible to miss.** It's the biggest, most prominent element on the Focus page. Full width, tall, centered.
3. **Checkbox animations matter.** When a habit is checked, there should be a satisfying visual response — scale animation, color fill, maybe a subtle confetti particle or checkmark animation.
4. **Focus timer must persist.** If the user leaves the app and comes back, the timer should show the correct elapsed time based on `started_at`. Don't lose their session.
5. **Charts must be beautiful.** Use rounded bars, gradient fills on area charts, smooth curves. The Stats page should make users WANT to do more work just to see the numbers go up.
6. **All data operations are optimistic.** Toggle a checkbox → UI updates immediately, DB save happens in background. If save fails, show a subtle toast error and revert.
7. **Empty states are encouraging, not blank.** Every empty list has an illustration/icon, a message, and a CTA. E.g., "No projects yet. Create your first one to start tracking progress."
8. **Mobile is primary.** 375px width is the base design. Bottom nav with 4 tabs. Everything thumb-reachable.
9. **No complex onboarding.** User signs up → lands on Habits page → app is self-explanatory. Maybe show a one-time tooltip: "Start by adding your daily habits" and "Create a project to track your goals."
10. **The random picker must feel fun, not stressful.** The animation of revealing the selected project should feel like a pleasant surprise, not a punishment. Use a card flip or slide-up animation.
