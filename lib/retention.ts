import { supabaseAdmin } from './supabase';

export interface RetentionNudge {
  needs_nudge: boolean;
  nudge_type?: 'low_session_count' | 'inactive' | 'none';
  details?: any;
  message?: string;
  cta?: string;
}

/**
 * Checks if student needs retention nudge
 */
export async function checkRetentionNudge(student_id: string): Promise<RetentionNudge> {
  const { data: student } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', student_id)
    .single();

  if (!student) {
    return { needs_nudge: false };
  }

  // Calculate days since signup
  const signupDate = new Date(student.signup_date);
  const now = new Date();
  const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

  // Check for low session count (< 3 sessions by day 7)
  if (daysSinceSignup >= 6 && daysSinceSignup <= 14 && student.session_count < 3) {
    return {
      needs_nudge: true,
      nudge_type: 'low_session_count',
      details: {
        session_count: student.session_count,
        days_since_signup: daysSinceSignup,
        threshold: 3,
      },
      message: "You're off to a great start! Book your next session to keep momentum.",
      cta: 'Book Session',
    };
  }

  // Check for general inactivity (no sessions in last 14 days)
  const { data: recentSessions } = await supabaseAdmin
    .from('tutoring_sessions')
    .select('id')
    .eq('student_id', student_id)
    .gte('session_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (!recentSessions || recentSessions.length === 0) {
    return {
      needs_nudge: true,
      nudge_type: 'inactive',
      details: {
        days_since_last_session: 14,
      },
      message: "We haven't seen you in a while! Ready to continue your learning journey?",
      cta: 'Schedule Now',
    };
  }

  return { needs_nudge: false, nudge_type: 'none' };
}

/**
 * Mock: Check if online tutors are available
 */
export async function checkTutorAvailability(): Promise<{
  available: boolean;
  online_tutors: number;
  next_available_slot: string;
  estimated_wait_minutes: number;
}> {
  // Mock implementation: random availability
  const available = Math.random() > 0.3; // 70% chance of availability

  return {
    available,
    online_tutors: available ? Math.floor(Math.random() * 5) + 1 : 0,
    next_available_slot: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    estimated_wait_minutes: available ? Math.floor(Math.random() * 10) + 1 : 0,
  };
}
