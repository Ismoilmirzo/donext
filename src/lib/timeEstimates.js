import { supabase } from './supabase';

/**
 * Estimate focus time for a task based on historical completion data.
 * Pure rule-based — no LLM needed.
 */

const ESTIMATE_BUCKETS = [15, 30, 45, 60, 90, 120];

function closestBucket(minutes) {
  let best = ESTIMATE_BUCKETS[0];
  let bestDiff = Math.abs(minutes - best);
  for (const bucket of ESTIMATE_BUCKETS) {
    const diff = Math.abs(minutes - bucket);
    if (diff < bestDiff) {
      best = bucket;
      bestDiff = diff;
    }
  }
  return best;
}

function extractKeywords(text) {
  const stop = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'in', 'of', 'on', 'up', 'set', 'with']);
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
}

function wordSimilarity(keywords1, keywords2) {
  if (!keywords1.length || !keywords2.length) return 0;
  const set2 = new Set(keywords2);
  const matches = keywords1.filter((w) => set2.has(w)).length;
  return matches / Math.max(keywords1.length, keywords2.length);
}

/**
 * Estimate minutes for a task based on historical data.
 * @param {string} taskTitle
 * @param {string} userId
 * @returns {Promise<{ estimate: number|null, confidence: string, basedOn: number }>}
 */
export async function estimateTaskTime(taskTitle, userId) {
  if (!userId || !taskTitle) return { estimate: null, confidence: 'none', basedOn: 0 };

  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('title,total_focus_minutes,total_elapsed_minutes,sessions_count')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gt('total_focus_minutes', 0)
    .limit(200);

  if (!completedTasks?.length) {
    // Fallback: estimate based on task title heuristics
    return { estimate: heuristicEstimate(taskTitle), confidence: 'low', basedOn: 0 };
  }

  const targetKeywords = extractKeywords(taskTitle);
  if (!targetKeywords.length) {
    const avgMinutes = completedTasks.reduce((s, t) => s + (t.total_focus_minutes || 0), 0) / completedTasks.length;
    return { estimate: closestBucket(avgMinutes), confidence: 'low', basedOn: completedTasks.length };
  }

  const scored = completedTasks
    .map((task) => ({
      minutes: task.total_focus_minutes || 0,
      similarity: wordSimilarity(targetKeywords, extractKeywords(task.title)),
    }))
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity);

  if (scored.length >= 3) {
    const top = scored.slice(0, 5);
    const weightedSum = top.reduce((s, item) => s + item.minutes * item.similarity, 0);
    const weightSum = top.reduce((s, item) => s + item.similarity, 0);
    return { estimate: closestBucket(weightedSum / weightSum), confidence: 'high', basedOn: top.length };
  }

  if (scored.length >= 1) {
    const avgMinutes = scored.reduce((s, item) => s + item.minutes, 0) / scored.length;
    return { estimate: closestBucket(avgMinutes), confidence: 'medium', basedOn: scored.length };
  }

  const avgMinutes = completedTasks.reduce((s, t) => s + (t.total_focus_minutes || 0), 0) / completedTasks.length;
  return { estimate: closestBucket(avgMinutes), confidence: 'low', basedOn: completedTasks.length };
}

function heuristicEstimate(title) {
  const words = (title || '').split(/\s+/).length;
  const heavy = /\b(research|design|write|build|implement|create|develop|analyze|review|test)\b/i;
  const light = /\b(fix|update|add|rename|remove|delete|check|read|list)\b/i;
  if (heavy.test(title)) return words > 5 ? 60 : 45;
  if (light.test(title)) return 15;
  return words > 6 ? 45 : 30;
}

/**
 * Format estimate for display
 */
export function formatEstimate(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `~${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
