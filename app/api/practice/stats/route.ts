import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats } from '@/lib/practice';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const goal_id = searchParams.get('goal_id');

  if (!student_id) {
    return NextResponse.json(
      { error: 'Missing student_id' },
      { status: 400 }
    );
  }

  try {
    // If no goal_id provided, get stats across all goals
    const stats = goal_id
      ? await getCategoryStats(student_id, goal_id)
      : await getCategoryStats(student_id);

    const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0);
    const totalAttempts = stats.reduce((sum, s) => sum + s.total, 0);

    return NextResponse.json({
      overall: {
        total_attempts: totalAttempts,
        correct: totalCorrect,
        accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
      },
      by_category: stats.reduce((acc, s) => {
        acc[s.category] = {
          total: s.total,
          correct: s.correct,
          accuracy: s.accuracy,
        };
        return acc;
      }, {} as Record<string, any>),
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
