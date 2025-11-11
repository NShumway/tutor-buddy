import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase';
import { Student } from '@/types';

export async function getCurrentStudent(): Promise<Student | null> {
  const accessToken = cookies().get('sb-access-token')?.value;
  const refreshToken = cookies().get('sb-refresh-token')?.value;

  if (!accessToken) {
    return null;
  }

  try {
    // Verify the session with Supabase
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      // Try to refresh the session if we have a refresh token
      if (refreshToken) {
        const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
          refresh_token: refreshToken,
        });

        if (refreshError || !refreshData.user) {
          return null;
        }

        // Update cookies with new tokens
        if (refreshData.session) {
          cookies().set('sb-access-token', refreshData.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          });

          cookies().set('sb-refresh-token', refreshData.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          });
        }

        // Fetch student profile with refreshed user
        const { data: student } = await supabaseAdmin
          .from('students')
          .select('*')
          .eq('id', refreshData.user.id)
          .single();

        return student;
      }

      return null;
    }

    // Fetch student profile
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('id', user.id)
      .single();

    return student;
  } catch (error) {
    console.error('Error getting current student:', error);
    return null;
  }
}
