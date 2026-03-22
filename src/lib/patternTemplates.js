import { supabase } from './supabase';

/**
 * Learn task patterns from completed projects.
 * Returns task templates based on project title similarity.
 */

function extractKeywords(text) {
  const stop = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'to', 'in', 'of', 'on', 'up', 'my', 'set', 'with', 'get', 'do', 'new']);
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
}

function similarity(keywords1, keywords2) {
  if (!keywords1.length || !keywords2.length) return 0;
  const set2 = new Set(keywords2);
  const matches = keywords1.filter((w) => set2.has(w)).length;
  return matches / Math.max(keywords1.length, keywords2.length);
}

/**
 * Find task patterns from user's completed projects.
 * @param {string} newProjectTitle
 * @param {string} userId
 * @returns {Promise<{ tasks: Array<{title: string, description: string}>, sourceProject: string|null, confidence: string }>}
 */
export async function findPatternTemplates(newProjectTitle, userId) {
  if (!newProjectTitle || !userId) {
    return { tasks: [], sourceProject: null, confidence: 'none' };
  }

  const { data: completedProjects } = await supabase
    .from('projects')
    .select('id,title')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);

  if (!completedProjects?.length) {
    return { tasks: [], sourceProject: null, confidence: 'none' };
  }

  const targetKeywords = extractKeywords(newProjectTitle);
  if (!targetKeywords.length) {
    return { tasks: [], sourceProject: null, confidence: 'none' };
  }

  // Score completed projects by title similarity
  const scored = completedProjects
    .map((project) => ({
      ...project,
      score: similarity(targetKeywords, extractKeywords(project.title)),
    }))
    .filter((p) => p.score > 0.2)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { tasks: [], sourceProject: null, confidence: 'none' };
  }

  const bestMatch = scored[0];

  // Fetch tasks from best matching project
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title,description')
    .eq('project_id', bestMatch.id)
    .eq('status', 'completed')
    .order('sort_order', { ascending: true })
    .limit(12);

  if (!tasks?.length) {
    return { tasks: [], sourceProject: null, confidence: 'none' };
  }

  const confidence = bestMatch.score >= 0.5 ? 'high' : 'medium';

  return {
    tasks: tasks.map((t) => ({ title: t.title, description: t.description || '' })),
    sourceProject: bestMatch.title,
    confidence,
  };
}
