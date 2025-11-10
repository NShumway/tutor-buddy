import { NextRequest, NextResponse } from 'next/server';
import { checkRetentionNudge } from '@/lib/retention';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const nudge = await checkRetentionNudge(student_id);
    return NextResponse.json(nudge);
  } catch (error: any) {
    console.error('Retention check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
