import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Mock auth - find student by email (any password works)
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !student) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Create mock session token
  const sessionToken = `mock-session-${student.id}`;

  // Set httpOnly cookie
  cookies().set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return NextResponse.json({
    success: true,
    student: {
      id: student.id,
      email: student.email,
      name: student.name,
    },
  });
}
