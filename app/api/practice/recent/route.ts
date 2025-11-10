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
      .from('practice_attempts')
      .select('id, category, correct, created_at')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ recent: data || [] });
  } catch (error: any) {
    console.error('Recent practice error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
