import { NextRequest, NextResponse } from 'next/server';
import { getAdaptiveProblems } from '@/lib/practice';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const goal_id = searchParams.get('goal_id');
  const student_id = searchParams.get('student_id');
  const count = parseInt(searchParams.get('count') || '5');

  if (!goal_id || !student_id) {
    return NextResponse.json(
      { error: 'Missing goal_id or student_id' },
      { status: 400 }
    );
  }

  try {
    const { problems, weak_categories } = await getAdaptiveProblems(
      goal_id,
      student_id,
      count
    );

    // Remove correct_answer and explanation from response
    const sanitizedProblems = problems.map((p) => ({
      id: p.id,
      category: p.category,
      difficulty: p.difficulty,
      question: p.question,
      options: p.options,
    }));

    return NextResponse.json({
      problems: sanitizedProblems,
      adaptive_info: {
        weak_categories,
      },
    });
  } catch (error: any) {
    console.error('Problems error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
