import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('tutoring_sessions')
      .select('id, session_date, duration_minutes, created_at')
      .eq('student_id', student_id)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error: any) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
