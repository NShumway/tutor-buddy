import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const accessToken = cookies().get('sb-access-token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get user from access token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Fetch student profile
  const { data: student, error: studentError } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', user.id)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ student });
}
