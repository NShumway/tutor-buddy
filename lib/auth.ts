import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { Student } from '@/types';

export async function getCurrentStudent(): Promise<Student | null> {
  const session = cookies().get('session')?.value;

  if (!session) {
    return null;
  }

  const studentId = session.replace('mock-session-', '');

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  return student;
}
