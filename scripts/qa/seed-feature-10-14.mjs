import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';

const DEFAULT_EMAIL = 'onlyforbspass@gmail.com';
const DEFAULT_PASSWORD = 'Ismoilmirzo$2007';
const DEFAULT_URL = process.env.VITE_SUPABASE_URL || 'https://bpyuooiriqauczahkssy.supabase.co';

function loadKeys() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    return {
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
      anon: process.env.VITE_SUPABASE_ANON_KEY,
    };
  }

  const keys = JSON.parse(execSync('supabase projects api-keys -o json', { encoding: 'utf8' }));
  return {
    serviceRole: keys.find((entry) => entry.id === 'service_role')?.api_key,
    anon: keys.find((entry) => entry.id === 'anon')?.api_key,
  };
}

function isoDate(date) {
  return format(date, 'yyyy-MM-dd');
}

function buildHabitLogs(habits, currentWeekStart, today) {
  const weeklyPatterns = [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 0, 0, 1],
    [0, 0, 0, 0, 1, 1, 1, 1],
    [1, 1, 0, 0, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0, 1, 0, 1],
  ];
  const weekdayPatterns = [
    [0, 1, 2, 3, 4, 5, 6],
    [0, 2, 4, 5],
    [1, 3, 5],
    [0],
    [0, 1, 2, 3, 4],
    [1, 5],
  ];

  return habits.flatMap((habit, habitIndex) => {
    const createdWeekIndex = habit.title === 'Stretch' ? 4 : 0;
    return Array.from({ length: 8 }, (_, weekIndex) => {
      if (weekIndex < createdWeekIndex) return [];

      const weekStart = addWeeks(subWeeks(currentWeekStart, 7), weekIndex);
      return weekdayPatterns[habitIndex].flatMap((dayOffset) => {
        if (!weeklyPatterns[habitIndex][weekIndex]) return [];
        const date = addDays(weekStart, dayOffset);
        if (date > today) return [];

        return {
          user_id: habit.user_id,
          habit_id: habit.id,
          date: isoDate(date),
          completed: true,
        };
      });
    }).flat();
  });
}

async function ensureUser(admin, email, password) {
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  let user = (list.data?.users || []).find((entry) => entry.email?.toLowerCase() === email.toLowerCase()) || null;
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Feature QA' },
    });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata || {}), full_name: 'Feature QA' },
    });
    if (updated.error) throw updated.error;
    user = updated.data.user;
  }

  const profileRes = await admin.from('profiles').upsert(
    {
      id: user.id,
      display_name: 'Feature QA',
      onboarding_done: true,
      random_without_reroll_count: 9,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileRes.error) throw profileRes.error;

  return user;
}

async function resetUserData(admin, userId) {
  const tables = ['badges', 'weekly_goals', 'streak_freezes', 'focus_sessions', 'tasks', 'projects', 'habit_logs', 'habits'];
  for (const table of tables) {
    const response = await admin.from(table).delete().eq('user_id', userId);
    if (response.error) throw response.error;
  }
}

async function seed() {
  const { serviceRole } = loadKeys();
  if (!serviceRole) throw new Error('Missing service role key for QA seeding.');

  const admin = createClient(DEFAULT_URL, serviceRole, { auth: { persistSession: false } });
  const user = await ensureUser(admin, process.env.QA_EMAIL || DEFAULT_EMAIL, process.env.QA_PASSWORD || DEFAULT_PASSWORD);
  await resetUserData(admin, user.id);

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStarts = Array.from({ length: 8 }, (_, index) => subWeeks(currentWeekStart, 7 - index));

  const habitRows = [
    { title: 'Read', icon: '📘', color: '#10B981', sort_order: 1, created_at: isoDate(addDays(weekStarts[0], 0)) },
    { title: 'Exercise', icon: '🏃', color: '#38BDF8', sort_order: 2, created_at: isoDate(addDays(weekStarts[0], 0)) },
    { title: 'Journal', icon: '📝', color: '#F59E0B', sort_order: 3, created_at: isoDate(addDays(weekStarts[0], 0)) },
    { title: 'Monday Reset', icon: '🧭', color: '#A78BFA', sort_order: 4, created_at: isoDate(addDays(weekStarts[0], 0)) },
    { title: 'Deep Work Prep', icon: '🧠', color: '#F97316', sort_order: 5, created_at: isoDate(addDays(weekStarts[0], 0)) },
    { title: 'Stretch', icon: '🧘', color: '#14B8A6', sort_order: 6, created_at: isoDate(addDays(weekStarts[4], 0)) },
  ].map((habit) => ({
    ...habit,
    user_id: user.id,
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  const habitsRes = await admin.from('habits').insert(habitRows).select('*');
  if (habitsRes.error) throw habitsRes.error;
  const habits = habitsRes.data || [];

  const habitLogs = buildHabitLogs(habits, currentWeekStart, today);
  if (habitLogs.length) {
    const logsRes = await admin.from('habit_logs').insert(habitLogs);
    if (logsRes.error) throw logsRes.error;
  }

  const projectsRes = await admin
    .from('projects')
    .insert([
      {
        user_id: user.id,
        title: 'Momentum MVP',
        description: 'Primary active QA project',
        color: '#10B981',
        priority_tag: 'urgent',
        preferred_time: 'morning',
        status: 'active',
      },
      {
        user_id: user.id,
        title: 'Learn DP',
        description: 'Completed project for history and badges',
        color: '#38BDF8',
        priority_tag: 'normal',
        preferred_time: 'any',
        status: 'completed',
        completed_at: new Date().toISOString(),
      },
      {
        user_id: user.id,
        title: 'IOAI Prep',
        description: 'Second project for breakdown charts',
        color: '#F59E0B',
        priority_tag: 'normal',
        preferred_time: 'evening',
        status: 'active',
      },
    ])
    .select('*');
  if (projectsRes.error) throw projectsRes.error;
  const [momentumProject, learnProject, ioaiProject] = projectsRes.data || [];

  const taskPayload = [
    ...Array.from({ length: 6 }, (_, index) => ({
      user_id: user.id,
      project_id: momentumProject.id,
      title: `Momentum task ${index + 1}`,
      description: 'Completed seed task',
      sort_order: index + 1,
      status: 'completed',
      completed_at: new Date().toISOString(),
      time_spent_minutes: 25,
      total_time_spent_minutes: 30,
    })),
    {
      user_id: user.id,
      project_id: momentumProject.id,
      title: 'Momentum task 7',
      description: 'Pending task for focus QA',
      sort_order: 7,
      status: 'pending',
    },
    ...Array.from({ length: 3 }, (_, index) => ({
      user_id: user.id,
      project_id: learnProject.id,
      title: `Learn DP task ${index + 1}`,
      description: 'Completed seed task',
      sort_order: index + 1,
      status: 'completed',
      completed_at: new Date().toISOString(),
      time_spent_minutes: 20,
      total_time_spent_minutes: 22,
    })),
  ];

  const tasksRes = await admin.from('tasks').insert(taskPayload).select('*');
  if (tasksRes.error) throw tasksRes.error;
  const tasks = tasksRes.data || [];
  const pendingTask = tasks.find((task) => task.status === 'pending');

  const weeklyFocusPlan = [
    { project_id: learnProject.id, task_id: tasks.find((task) => task.project_id === learnProject.id)?.id || null, minutes: 90, total: 100 },
    { project_id: ioaiProject.id, task_id: null, minutes: 120, total: 140 },
    { project_id: learnProject.id, task_id: null, minutes: 150, total: 165 },
    { project_id: ioaiProject.id, task_id: null, minutes: 180, total: 195 },
    { project_id: learnProject.id, task_id: null, minutes: 210, total: 230 },
    { project_id: momentumProject.id, task_id: tasks.find((task) => task.project_id === momentumProject.id)?.id || null, minutes: 80, total: 95 },
    { project_id: ioaiProject.id, task_id: null, minutes: 40, total: 50 },
    { project_id: learnProject.id, task_id: null, minutes: 30, total: 35 },
  ];

  const sessionRows = weeklyFocusPlan.flatMap((week, index) => {
    const weekStart = weekStarts[index];
    if (index < 6) {
      return [
        {
          user_id: user.id,
          project_id: week.project_id,
          task_id: week.task_id,
          date: isoDate(weekStart),
          duration_minutes: week.minutes,
          total_duration_minutes: week.total,
        },
      ];
    }

    if (index === 6) {
      return [
        {
          user_id: user.id,
          project_id: momentumProject.id,
          task_id: tasks.find((task) => task.project_id === momentumProject.id)?.id || null,
          date: isoDate(weekStart),
          duration_minutes: 80,
          total_duration_minutes: 95,
        },
        {
          user_id: user.id,
          project_id: ioaiProject.id,
          task_id: null,
          date: isoDate(addDays(weekStart, 2)),
          duration_minutes: 40,
          total_duration_minutes: 50,
        },
      ];
    }

    return [
      {
        user_id: user.id,
        project_id: learnProject.id,
        task_id: null,
        date: isoDate(weekStart),
        duration_minutes: 30,
        total_duration_minutes: 35,
      },
      {
        user_id: user.id,
        project_id: ioaiProject.id,
        task_id: null,
        date: isoDate(addDays(weekStart, 2)),
        duration_minutes: 20,
        total_duration_minutes: 25,
      },
    ];
  });

  const sessionsRes = await admin.from('focus_sessions').insert(sessionRows);
  if (sessionsRes.error) throw sessionsRes.error;

  const goalRows = [
    { week_start: isoDate(subWeeks(currentWeekStart, 4)), target_minutes: 150 },
    { week_start: isoDate(subWeeks(currentWeekStart, 3)), target_minutes: 180 },
    { week_start: isoDate(subWeeks(currentWeekStart, 2)), target_minutes: 210 },
    { week_start: isoDate(subWeeks(currentWeekStart, 1)), target_minutes: 240 },
  ].map((row) => ({
    ...row,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }));

  const goalsRes = await admin.from('weekly_goals').insert(goalRows);
  if (goalsRes.error) throw goalsRes.error;

  const profileResetRes = await admin
    .from('profiles')
    .update({
      display_name: 'Feature QA',
      onboarding_done: true,
      random_without_reroll_count: 9,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (profileResetRes.error) throw profileResetRes.error;

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: user.email,
        userId: user.id,
        pendingTaskId: pendingTask?.id || null,
        seededHabits: habits.length,
        seededTasks: tasks.length,
        seededSessions: sessionRows.length,
      },
      null,
      2
    )
  );
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
