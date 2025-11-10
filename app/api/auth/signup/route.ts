import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // Create student record in students table
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        id: authData.user.id, // Use same ID as auth user
        email,
        name,
      })
      .select()
      .single();

    if (studentError) {
      console.error('Student creation error:', studentError);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create student profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        email: student.email,
        name: student.name,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
