import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/chat';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const messages = await getChatHistory(student_id, limit);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('History error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
