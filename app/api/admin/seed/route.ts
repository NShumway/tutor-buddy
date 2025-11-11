import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbeddings } from '@/lib/openai';
import { chunkText } from '@/lib/chunking';
import sampleTranscripts from '@/data/sample-transcripts.json';

// This is a protected admin endpoint - should be secured in production
export async function POST(request: NextRequest) {
  try {
    // Simple secret-based auth - replace with proper admin auth in production
    const authHeader = request.headers.get('authorization');
    const secret = process.env.ADMIN_SEED_SECRET || 'change-me-in-production';

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reset } = await request.json();

    if (reset) {
      console.log('Resetting database...');

      // Clear all data
      await supabaseAdmin.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('tutor_flags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('practice_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('session_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('tutoring_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabaseAdmin.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Delete auth users
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      for (const user of users) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    // Create students with auth
    const students = [
      { email: 'sarah@example.com', name: 'Sarah Johnson', created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
      { email: 'marcus@example.com', name: 'Marcus Chen', created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
      { email: 'emily@example.com', name: 'Emily Rodriguez', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
      { email: 'david@example.com', name: 'David Kim', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { email: 'isabella@example.com', name: 'Isabella Martinez', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
    ];

    const createdStudents = [];
    const defaultPassword = 'password123';

    for (const student of students) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: student.email,
        password: defaultPassword,
        email_confirm: true,
      });

      if (authError) {
        console.error(`Error creating auth user for ${student.email}:`, authError);
        continue;
      }

      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          id: authData.user.id,
          email: student.email,
          name: student.name,
          created_at: student.created_at,
        })
        .select()
        .single();

      if (studentError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.error(`Error creating student for ${student.email}:`, studentError);
        continue;
      }

      createdStudents.push(studentData);
    }

    // Create goals (simplified version)
    const goals = [
      { student_id: createdStudents[0].id, goal_type: 'SAT_Math', status: 'completed', current_accuracy: 0.88, target_accuracy: 0.75, problems_completed: 45, completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { student_id: createdStudents[0].id, goal_type: 'College_Essays', status: 'active', current_accuracy: 0.0, target_accuracy: 0.75, problems_completed: 0 },
      { student_id: createdStudents[1].id, goal_type: 'AP_Chemistry', status: 'active', current_accuracy: 0.62, target_accuracy: 0.75, problems_completed: 18 },
      { student_id: createdStudents[2].id, goal_type: 'SAT_Math', status: 'active', current_accuracy: 0.55, target_accuracy: 0.75, problems_completed: 32 },
      { student_id: createdStudents[3].id, goal_type: 'SAT_Math', status: 'completed', current_accuracy: 0.82, target_accuracy: 0.75, problems_completed: 50, completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
      { student_id: createdStudents[3].id, goal_type: 'AP_Physics', status: 'active', current_accuracy: 0.78, target_accuracy: 0.75, problems_completed: 38 },
      { student_id: createdStudents[3].id, goal_type: 'AP_Calculus', status: 'active', current_accuracy: 0.71, target_accuracy: 0.75, problems_completed: 28 },
      { student_id: createdStudents[4].id, goal_type: 'SAT_Verbal', status: 'paused', current_accuracy: 0.68, target_accuracy: 0.75, problems_completed: 22 },
    ];

    await supabaseAdmin.from('goals').insert(goals);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      studentsCreated: createdStudents.length,
      goalsCreated: goals.length,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error.message || 'Seeding failed' },
      { status: 500 }
    );
  }
}
