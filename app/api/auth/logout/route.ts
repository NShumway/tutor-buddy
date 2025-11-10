import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  // Sign out from Supabase if we have a token
  if (accessToken) {
    await supabaseAdmin.auth.admin.signOut(accessToken);
  }

  // Clear auth cookies
  cookies().delete('sb-access-token');
  cookies().delete('sb-refresh-token');

  return NextResponse.json({ success: true });
}
