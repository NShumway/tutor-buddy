import { NextRequest, NextResponse } from 'next/server';
import { completeGoal, getGoalRecommendations } from '@/lib/goals';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;

    // Get goal type before completing
    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('goal_type')
      .eq('id', goalId)
      .single();

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Complete the goal
    const completedGoal = await completeGoal(goalId);

    // Get recommendations
    const recommendations = getGoalRecommendations(goal.goal_type);

    return NextResponse.json({
      success: true,
      goal: completedGoal,
      recommendations,
    });
  } catch (error: any) {
    console.error('Complete goal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
