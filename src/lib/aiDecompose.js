import { supabase } from './supabase';

async function callAiEdgeFunction(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Not authenticated' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-decompose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-user-jwt': session.access_token,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok) {
    return {
      error: body.message || body.error || 'AI request failed',
      rateLimited: res.status === 429,
      remaining: body.remaining,
    };
  }

  return { tasks: body.tasks, remaining: body.remaining, parsed: body.parsed };
}

/**
 * Break a project into tasks.
 */
export async function decomposeProject({ title, description, locale, deadline }) {
  return callAiEdgeFunction({ title, description, locale, deadline, mode: 'decompose' });
}

/**
 * Split a single task into 2-3 smaller tasks.
 */
export async function splitTask({ taskTitle, taskDescription, projectTitle, locale }) {
  return callAiEdgeFunction({
    title: projectTitle,
    description: taskDescription,
    locale,
    mode: 'split',
    taskTitle,
  });
}

/**
 * Clarify a vague task with specific action + deliverable.
 */
export async function clarifyTask({ taskTitle, taskDescription, projectTitle, locale }) {
  return callAiEdgeFunction({
    title: projectTitle,
    description: taskDescription,
    locale,
    mode: 'clarify',
    taskTitle,
  });
}

/**
 * Re-plan remaining tasks for a project with completed tasks as context.
 */
export async function replanProject({ title, description, locale, deadline, completedTasks, pendingTasks }) {
  return callAiEdgeFunction({
    title,
    description,
    locale,
    deadline,
    mode: 'replan',
    completedTasks,
    pendingTasks,
  });
}

/**
 * Parse natural language input into project fields.
 * Client-side parsing — no AI needed for basic extraction.
 */
export function parseNaturalLanguageProject(text) {
  if (!text || !text.trim()) return null;

  const input = text.trim();
  let priority_tag = 'normal';
  let deadline_date = null;
  let description = '';

  // Extract priority
  const urgentPatterns = /\b(urgent|asap|critical|immediately|right away|shoshilinch)\b/i;
  const somedayPatterns = /\b(someday|eventually|when i can|no rush|whenever|qachondir)\b/i;
  if (urgentPatterns.test(input)) priority_tag = 'urgent';
  else if (somedayPatterns.test(input)) priority_tag = 'someday';

  // Extract deadline
  const datePatterns = [
    { pattern: /\bby\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, handler: extractDayOfWeek },
    { pattern: /\bby\s+(next\s+)?(\w+\s+\d{1,2})\b/i, handler: extractMonthDay },
    { pattern: /\bby\s+(\d{4}-\d{2}-\d{2})\b/i, handler: (m) => m[1] },
    { pattern: /\b(tomorrow)\b/i, handler: () => offsetDate(1) },
    { pattern: /\bin\s+(\d+)\s+days?\b/i, handler: (m) => offsetDate(parseInt(m[1])) },
    { pattern: /\bnext\s+week\b/i, handler: () => offsetDate(7) },
    { pattern: /\bin\s+(\d+)\s+weeks?\b/i, handler: (m) => offsetDate(parseInt(m[1]) * 7) },
    { pattern: /\bin\s+(\d+)\s+months?\b/i, handler: (m) => offsetDate(parseInt(m[1]) * 30) },
  ];

  for (const { pattern, handler } of datePatterns) {
    const match = input.match(pattern);
    if (match) {
      deadline_date = handler(match);
      if (deadline_date) break;
    }
  }

  // Clean title: remove priority and deadline phrases
  let title = input
    .replace(urgentPatterns, '')
    .replace(somedayPatterns, '')
    .replace(/\bby\s+(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, '')
    .replace(/\bby\s+(next\s+)?(\w+\s+\d{1,2})\b/i, '')
    .replace(/\bby\s+\d{4}-\d{2}-\d{2}\b/i, '')
    .replace(/\b(tomorrow)\b/i, '')
    .replace(/\bin\s+\d+\s+(days?|weeks?|months?)\b/i, '')
    .replace(/\bnext\s+week\b/i, '')
    .replace(/[,;]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If title has "description:" or after a dash, split
  const descSep = title.match(/\s+[-–]\s+(.+)$/);
  if (descSep) {
    description = descSep[1].trim();
    title = title.replace(descSep[0], '').trim();
  }

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return {
    title: title || input.slice(0, 100),
    description,
    priority_tag,
    deadline_date,
  };
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function extractDayOfWeek(match) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(match[2].toLowerCase());
  if (targetDay === -1) return null;
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  if (match[1]) diff += 7; // "next" adds a week
  return offsetDate(diff);
}

function extractMonthDay(match) {
  const dateStr = match[2];
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  const parts = dateStr.toLowerCase().split(/\s+/);
  if (parts.length !== 2) return null;
  const monthIdx = months.indexOf(parts[0]);
  if (monthIdx === -1) return null;
  const day = parseInt(parts[1]);
  if (isNaN(day) || day < 1 || day > 31) return null;
  const year = new Date().getFullYear();
  const d = new Date(year, monthIdx, day);
  if (d < new Date()) d.setFullYear(year + 1);
  return d.toISOString().slice(0, 10);
}
