import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getProblemById, checkConsecutiveFailures, getCategoryStats } from '@/lib/practice';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, goal_id, problem_id, category, answer, time_spent_seconds } = body;

    if (!student_id || !goal_id || !problem_id || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get problem
    const problem = getProblemById(problem_id);
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if correct
    const correct = answer === problem.correct_answer;

    // Save attempt
    await supabaseAdmin.from('practice_attempts').insert({
      student_id,
      goal_id,
      problem_id,
      category,
      correct,
      student_answer: answer,
      time_spent_seconds,
    });

    // Update goal accuracy
    const stats = await getCategoryStats(student_id, goal_id);
    const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0);
    const totalAttempts = stats.reduce((sum, s) => sum + s.total, 0);
    const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    await supabaseAdmin
      .from('goals')
      .update({
        current_accuracy: overallAccuracy,
        problems_completed: totalAttempts,
      })
      .eq('id', goal_id);

    // Check for consecutive failures
    const consecutiveFailures = await checkConsecutiveFailures(student_id, category);
    const needsTutorFlag = consecutiveFailures >= 3;

    // Create tutor flag if needed
    if (needsTutorFlag) {
      await supabaseAdmin.from('tutor_flags').insert({
        student_id,
        flag_type: 'struggling',
        category,
        message: `Student failed ${consecutiveFailures} consecutive ${category} problems`,
        resolved: false,
      });
    }

    // Get category-specific accuracy
    const categoryStats = stats.find((s) => s.category === category);

    return NextResponse.json({
      correct,
      explanation: problem.explanation,
      updated_accuracy: {
        overall: overallAccuracy,
        category: categoryStats?.accuracy || 0,
      },
      consecutive_failures: consecutiveFailures,
      needs_tutor_flag: needsTutorFlag,
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
