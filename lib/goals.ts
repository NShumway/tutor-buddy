import { supabaseAdmin } from './supabase';
import { Goal } from '@/types';
import goalRelationships from '@/data/goal-relationships.json';

export interface GoalRecommendation {
  goal_type: string;
  reason: string;
  conversion_rate: number;
}

/**
 * Creates a new goal for a student
 */
export async function createGoal(
  student_id: string,
  goal_type: string,
  target_accuracy: number = 0.75
): Promise<Goal> {
  const { data, error } = await supabaseAdmin
    .from('goals')
    .insert({
      student_id,
      goal_type,
      target_accuracy,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }

  return data;
}

/**
 * Gets all goals for a student
 */
export async function getStudentGoals(
  student_id: string,
  status?: string
): Promise<Goal[]> {
  let query = supabaseAdmin
    .from('goals')
    .select('*')
    .eq('student_id', student_id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get goals: ${error.message}`);
  }

  return data || [];
}

/**
 * Checks if a goal should be marked as completed
 */
export async function checkGoalCompletion(goal_id: string): Promise<boolean> {
  const { data: goal } = await supabaseAdmin
    .from('goals')
    .select('current_accuracy, target_accuracy, problems_completed')
    .eq('id', goal_id)
    .single();

  if (!goal) return false;

  // Goal is complete if accuracy >= target AND at least 20 problems completed
  return goal.current_accuracy >= goal.target_accuracy && goal.problems_completed >= 20;
}

/**
 * Marks a goal as completed
 */
export async function completeGoal(goal_id: string): Promise<Goal> {
  const { data, error } = await supabaseAdmin
    .from('goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goal_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete goal: ${error.message}`);
  }

  return data;
}

/**
 * Gets related goal recommendations
 */
export function getGoalRecommendations(goal_type: string): GoalRecommendation[] {
  return (goalRelationships as any)[goal_type] || [];
}

/**
 * Calculates progress percentage (0-100)
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
