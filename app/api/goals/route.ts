import { NextRequest, NextResponse } from 'next/server';
import { createGoal, getStudentGoals, calculateProgress } from '@/lib/goals';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const status = searchParams.get('status') || undefined;

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const goals = await getStudentGoals(student_id, status);

    // Add progress percentage to each goal
    const goalsWithProgress = goals.map((g) => ({
      ...g,
      progress_percentage: calculateProgress(g.current_accuracy, g.target_accuracy),
    }));

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error: any) {
    console.error('Goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, goal_type, target_accuracy = 0.75 } = body;

    if (!student_id || !goal_type) {
      return NextResponse.json(
        { error: 'Missing student_id or goal_type' },
        { status: 400 }
      );
    }

    const goal = await createGoal(student_id, goal_type, target_accuracy);

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error('Create goal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
