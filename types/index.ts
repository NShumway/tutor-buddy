export interface Student {
  id: string;
  email: string;
  name: string;
  signup_date: string;
  session_count: number;
  primary_tutor_id?: string;
  created_at: string;
}

export interface TutoringSession {
  id: string;
  student_id: string;
  session_date: string;
  transcript: string;
  duration_minutes?: number;
  tutor_id?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  student_id: string;
  goal_type: string;
  status: 'active' | 'completed' | 'paused';
  target_accuracy: number;
  current_accuracy: number;
  problems_completed: number;
  created_at: string;
  completed_at?: string;
}

export interface PracticeAttempt {
  id: string;
  student_id: string;
  goal_id: string;
  problem_id: string;
  category: string;
  correct: boolean;
  student_answer?: string;
  time_spent_seconds?: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  student_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface TutorFlag {
  id: string;
  student_id: string;
  tutor_id?: string;
  flag_type: 'struggling' | 'inactive' | 'at_risk';
  category?: string;
  message?: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}
