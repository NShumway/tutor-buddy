import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    let query = supabaseAdmin
      .from('students')
      .select('id, name, email')
      .order('name', { ascending: true });

    // If search query provided, filter by name or email
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: students, error } = await query.limit(50);

    if (error) {
      console.error('Students fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    return NextResponse.json({ students: students || [] });
  } catch (error: any) {
    console.error('Students API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
