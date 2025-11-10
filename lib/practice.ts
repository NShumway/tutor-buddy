import { supabaseAdmin } from './supabase';
import problemsData from '@/data/problems.json';

export interface Problem {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface CategoryStats {
  category: string;
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * Gets all problems for a category
 */
export function getProblemsByCategory(category: string): Problem[] {
  return (problemsData as any)[category] || [];
}

/**
 * Gets a single problem by ID
 */
export function getProblemById(problemId: string): Problem | null {
  for (const category of Object.keys(problemsData)) {
    const problems = (problemsData as any)[category] as Problem[];
    const problem = problems.find((p) => p.id === problemId);
    if (problem) return problem;
  }
  return null;
}

/**
 * Calculates accuracy stats per category for a student/goal
 */
export async function getCategoryStats(
  student_id: string,
  goal_id?: string
): Promise<CategoryStats[]> {
  let query = supabaseAdmin
    .from('practice_attempts')
    .select('category, correct')
    .eq('student_id', student_id);

  // Only filter by goal_id if provided
  if (goal_id) {
    query = query.eq('goal_id', goal_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  // Group by category
  const categoryMap = new Map<string, { total: number; correct: number }>();

  for (const attempt of data || []) {
    const stats = categoryMap.get(attempt.category) || { total: 0, correct: 0 };
    stats.total++;
    if (attempt.correct) stats.correct++;
    categoryMap.set(attempt.category, stats);
  }

  // Convert to array with accuracy
  return Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
  }));
}

/**
 * Adaptive problem selection: prioritize weak categories
 */
export async function getAdaptiveProblems(
  goal_id: string,
  student_id: string,
  count: number = 5
): Promise<{ problems: Problem[]; weak_categories: string[] }> {
  // 1. Get goal to determine relevant categories
  const { data: goal } = await supabaseAdmin
    .from('goals')
    .select('goal_type')
    .eq('id', goal_id)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  // 2. Determine categories for this goal type
  const goalCategories = getCategoriesForGoalType(goal.goal_type);

  // 3. Get category stats
  const stats = await getCategoryStats(student_id, goal_id);

  // 4. Identify weak categories (< 75% accuracy or < 10 attempts)
  const weakCategories = stats
    .filter((s) => s.accuracy < 0.75 || s.total < 10)
    .map((s) => s.category);

  // Also include categories with no attempts yet
  for (const cat of goalCategories) {
    if (!stats.find((s) => s.category === cat)) {
      weakCategories.push(cat);
    }
  }

  // 5. Select problems: 70% from weak categories, 30% from all
  const weakCount = Math.ceil(count * 0.7);
  const regularCount = count - weakCount;

  const selectedProblems: Problem[] = [];

  // Get weak category problems
  if (weakCategories.length > 0) {
    for (let i = 0; i < weakCount; i++) {
      const category = weakCategories[i % weakCategories.length];
      const categoryProblems = getProblemsByCategory(category);
      if (categoryProblems.length > 0) {
        const randomProblem =
          categoryProblems[Math.floor(Math.random() * categoryProblems.length)];
        selectedProblems.push(randomProblem);
      }
    }
  }

  // Get regular problems from all categories
  for (let i = 0; i < regularCount; i++) {
    const category = goalCategories[i % goalCategories.length];
    const categoryProblems = getProblemsByCategory(category);
    if (categoryProblems.length > 0) {
      const randomProblem =
        categoryProblems[Math.floor(Math.random() * categoryProblems.length)];
      selectedProblems.push(randomProblem);
    }
  }

  return {
    problems: selectedProblems,
    weak_categories: weakCategories,
  };
}

/**
 * Maps goal types to their relevant categories
 */
function getCategoriesForGoalType(goalType: string): string[] {
  const mapping: Record<string, string[]> = {
    SAT_Math: ['SAT_Math_Algebra', 'SAT_Math_Geometry'],
    AP_Chemistry: ['AP_Chem_Stoichiometry'],
  };

  return mapping[goalType] || [];
}

/**
 * Checks if student is struggling (3+ consecutive failures in same category)
 */
export async function checkConsecutiveFailures(
  student_id: string,
  category: string
): Promise<number> {
  const { data } = await supabaseAdmin
    .from('practice_attempts')
    .select('correct')
    .eq('student_id', student_id)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return 0;

  let consecutive = 0;
  for (const attempt of data) {
    if (!attempt.correct) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}
