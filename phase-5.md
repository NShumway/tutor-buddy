# Phase 5: Goals Tracking + Retention Triggers

**Goal**: Implement multi-goal tracking, goal completion detection, and retention triggers (related goal suggestions, inactivity nudges, tutor availability checks).

**Duration**: ~2 days

## Requirements

1. Create goal management APIs (create, list, update, complete)
2. Implement goal completion detection (reaches target accuracy threshold)
3. Build retention trigger system:
   - **Goal Completion**: Suggest related subjects
   - **Inactivity**: Nudge students with <3 sessions by Day 7
   - **Tutor Availability**: Mock API for checking online tutors
4. Create goal progress visualization components
5. Build retention notification system

## Database Schema

Already created in Phase 1, relevant tables:

```sql
-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- SAT_Math, AP_Chemistry, etc.
  status TEXT DEFAULT 'active', -- active, completed, paused
  target_accuracy DECIMAL DEFAULT 0.75,
  current_accuracy DECIMAL DEFAULT 0.0,
  problems_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Students (for session count tracking)
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  signup_date TIMESTAMP DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,
  primary_tutor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Goal Type to Related Goals Mapping

**data/goal-relationships.json**
```json
{
  "SAT_Math": [
    {
      "goal_type": "SAT_Verbal",
      "reason": "Complete your SAT prep",
      "conversion_rate": 0.85
    },
    {
      "goal_type": "College_Essays",
      "reason": "Students who ace SAT often need essay help",
      "conversion_rate": 0.80
    },
    {
      "goal_type": "AP_Calculus",
      "reason": "Build on your math skills",
      "conversion_rate": 0.45
    }
  ],
  "AP_Chemistry": [
    {
      "goal_type": "AP_Physics",
      "reason": "80% of Chemistry students take Physics",
      "conversion_rate": 0.80
    },
    {
      "goal_type": "AP_Biology",
      "reason": "Expand your science knowledge",
      "conversion_rate": 0.65
    },
    {
      "goal_type": "SAT_Science",
      "reason": "Prepare for college admissions",
      "conversion_rate": 0.55
    }
  ],
  "SAT_Verbal": [
    {
      "goal_type": "College_Essays",
      "reason": "Polish your writing skills",
      "conversion_rate": 0.90
    },
    {
      "goal_type": "AP_English",
      "reason": "Build on your verbal skills",
      "conversion_rate": 0.50
    }
  ]
}
```

## API Endpoints

### POST /api/goals

Creates a new goal for a student.

**Request:**
```json
{
  "student_id": "uuid",
  "goal_type": "SAT_Math",
  "target_accuracy": 0.75
}
```

**Response:**
```json
{
  "success": true,
  "goal": {
    "id": "uuid",
    "student_id": "uuid",
    "goal_type": "SAT_Math",
    "status": "active",
    "target_accuracy": 0.75,
    "current_accuracy": 0.0,
    "problems_completed": 0,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

### GET /api/goals

Lists all goals for a student.

**Query params:**
- `student_id`: UUID
- `status`: "active" | "completed" | "paused" (optional)

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "goal_type": "SAT_Math",
      "status": "active",
      "current_accuracy": 0.68,
      "target_accuracy": 0.75,
      "problems_completed": 42,
      "progress_percentage": 91
    }
  ]
}
```

### POST /api/goals/:id/complete

Marks a goal as completed and returns related goal suggestions.

**Response:**
```json
{
  "success": true,
  "goal": {
    "id": "uuid",
    "status": "completed",
    "completed_at": "2025-01-15T10:00:00Z"
  },
  "recommendations": [
    {
      "goal_type": "SAT_Verbal",
      "reason": "Complete your SAT prep",
      "conversion_rate": 0.85
    },
    {
      "goal_type": "College_Essays",
      "reason": "Students who ace SAT often need essay help",
      "conversion_rate": 0.80
    }
  ]
}
```

### GET /api/retention/check

Checks if a student needs retention nudges.

**Query params:**
- `student_id`: UUID

**Response:**
```json
{
  "needs_nudge": true,
  "nudge_type": "low_session_count",
  "details": {
    "session_count": 2,
    "days_since_signup": 6,
    "threshold": 3
  },
  "message": "You're off to a great start! Book your next session to keep momentum.",
  "cta": "Book Session"
}
```

### GET /api/mock/tutor-availability

Mock API to check if online tutors are available.

**Response:**
```json
{
  "available": true,
  "online_tutors": 3,
  "next_available_slot": "2025-01-15T16:00:00Z",
  "estimated_wait_minutes": 5
}
```

## Implementation Steps

### 1. Create Goal Relationships Data

Create `data/goal-relationships.json` with the structure shown above.

### 2. Create Goals Utility

**lib/goals.ts**
```typescript
import { supabaseAdmin } from './supabase';
import { Goal } from '@/types';
import goalRelationships from '@/data/goal-relationships.json';

export interface GoalRecommendation {
  goal_type: string;
  reason: string;
  conversion_rate: number;
}

/**
 * Creates a new goal for a student
 */
export async function createGoal(
  student_id: string,
  goal_type: string,
  target_accuracy: number = 0.75
): Promise<Goal> {
  const { data, error } = await supabaseAdmin
    .from('goals')
    .insert({
      student_id,
      goal_type,
      target_accuracy,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }

  return data;
}

/**
 * Gets all goals for a student
 */
export async function getStudentGoals(
  student_id: string,
  status?: string
): Promise<Goal[]> {
  let query = supabaseAdmin
    .from('goals')
    .select('*')
    .eq('student_id', student_id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get goals: ${error.message}`);
  }

  return data || [];
}

/**
 * Checks if a goal should be marked as completed
 */
export async function checkGoalCompletion(goal_id: string): Promise<boolean> {
  const { data: goal } = await supabaseAdmin
    .from('goals')
    .select('current_accuracy, target_accuracy, problems_completed')
    .eq('id', goal_id)
    .single();

  if (!goal) return false;

  // Goal is complete if accuracy >= target AND at least 20 problems completed
  return goal.current_accuracy >= goal.target_accuracy && goal.problems_completed >= 20;
}

/**
 * Marks a goal as completed
 */
export async function completeGoal(goal_id: string): Promise<Goal> {
  const { data, error } = await supabaseAdmin
    .from('goals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', goal_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete goal: ${error.message}`);
  }

  return data;
}

/**
 * Gets related goal recommendations
 */
export function getGoalRecommendations(goal_type: string): GoalRecommendation[] {
  return (goalRelationships as any)[goal_type] || [];
}

/**
 * Calculates progress percentage (0-100)
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
```

### 3. Create Retention Utility

**lib/retention.ts**
```typescript
import { supabaseAdmin } from './supabase';
import { Student } from '@/types';

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
```

### 4. Create Goals API

**app/api/goals/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createGoal, getStudentGoals, calculateProgress } from '@/lib/goals';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const status = searchParams.get('status') || undefined;

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const goals = await getStudentGoals(student_id, status);

    // Add progress percentage to each goal
    const goalsWithProgress = goals.map((g) => ({
      ...g,
      progress_percentage: calculateProgress(g.current_accuracy, g.target_accuracy),
    }));

    return NextResponse.json({ goals: goalsWithProgress });
  } catch (error: any) {
    console.error('Goals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, goal_type, target_accuracy = 0.75 } = body;

    if (!student_id || !goal_type) {
      return NextResponse.json(
        { error: 'Missing student_id or goal_type' },
        { status: 400 }
      );
    }

    const goal = await createGoal(student_id, goal_type, target_accuracy);

    return NextResponse.json({ success: true, goal });
  } catch (error: any) {
    console.error('Create goal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**app/api/goals/[id]/complete/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { completeGoal, getGoalRecommendations } from '@/lib/goals';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const goalId = params.id;

    // Get goal type before completing
    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('goal_type')
      .eq('id', goalId)
      .single();

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Complete the goal
    const completedGoal = await completeGoal(goalId);

    // Get recommendations
    const recommendations = getGoalRecommendations(goal.goal_type);

    return NextResponse.json({
      success: true,
      goal: completedGoal,
      recommendations,
    });
  } catch (error: any) {
    console.error('Complete goal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5. Create Retention Check API

**app/api/retention/check/route.ts**
```typescript
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
```

### 6. Create Mock Tutor Availability API

**app/api/mock/tutor-availability/route.ts**
```typescript
import { NextResponse } from 'next/server';
import { checkTutorAvailability } from '@/lib/retention';

export async function GET() {
  try {
    const availability = await checkTutorAvailability();
    return NextResponse.json(availability);
  } catch (error: any) {
    console.error('Availability error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 7. Create Goal Progress Component

**components/GoalProgress.tsx**
```typescript
import { Goal } from '@/types';

interface GoalProgressProps {
  goal: Goal & { progress_percentage: number };
}

export default function GoalProgress({ goal }: GoalProgressProps) {
  const isCompleted = goal.status === 'completed';

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">
            {goal.goal_type.replace(/_/g, ' ')}
          </h3>
          <p className="text-sm text-gray-600">
            Target: {Math.round(goal.target_accuracy * 100)}% accuracy
          </p>
        </div>
        {isCompleted && (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
            ✓ Completed
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span className="font-semibold">{goal.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${goal.progress_percentage}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>
          {Math.round(goal.current_accuracy * 100)}% current accuracy
        </span>
        <span>{goal.problems_completed} problems completed</span>
      </div>
    </div>
  );
}
```

### 8. Create Retention Nudge Component

**components/RetentionNudge.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';

interface RetentionNudgeProps {
  student_id: string;
}

export default function RetentionNudge({ student_id }: RetentionNudgeProps) {
  const [nudge, setNudge] = useState<any>(null);

  useEffect(() => {
    checkNudge();
  }, [student_id]);

  async function checkNudge() {
    try {
      const res = await fetch(`/api/retention/check?student_id=${student_id}`);
      const data = await res.json();
      if (data.needs_nudge) {
        setNudge(data);
      }
    } catch (error) {
      console.error('Failed to check nudge:', error);
    }
  }

  if (!nudge) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">👋</span>
        <div className="flex-1">
          <p className="font-semibold text-yellow-900 mb-1">
            {nudge.nudge_type === 'low_session_count'
              ? 'Keep the Momentum!'
              : 'We Miss You!'}
          </p>
          <p className="text-yellow-800 text-sm mb-3">{nudge.message}</p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">
            {nudge.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 9. Create Goal Completion Banner Component

**components/GoalCompletionBanner.tsx**
```typescript
'use client';

interface Recommendation {
  goal_type: string;
  reason: string;
  conversion_rate: number;
}

interface GoalCompletionBannerProps {
  recommendations: Recommendation[];
  onSelectGoal: (goalType: string) => void;
}

export default function GoalCompletionBanner({
  recommendations,
  onSelectGoal,
}: GoalCompletionBannerProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-green-900 mb-2">
        🎉 Congratulations on completing your goal!
      </h3>
      <p className="text-green-800 mb-4">
        Students who complete this goal often continue with:
      </p>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((rec) => (
          <div
            key={rec.goal_type}
            className="bg-white p-4 rounded-lg flex justify-between items-center"
          >
            <div>
              <h4 className="font-semibold">{rec.goal_type.replace(/_/g, ' ')}</h4>
              <p className="text-sm text-gray-600">{rec.reason}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round(rec.conversion_rate * 100)}% of students choose this
              </p>
            </div>
            <button
              onClick={() => onSelectGoal(rec.goal_type)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] POST /api/goals creates new goals
- [ ] GET /api/goals lists all student goals with progress
- [ ] POST /api/goals/:id/complete marks goal as completed
- [ ] Goal completion returns related recommendations
- [ ] GET /api/retention/check identifies students needing nudges
- [ ] Low session count trigger works (< 3 sessions by day 7)
- [ ] Inactivity trigger works (no sessions in 14 days)
- [ ] Mock tutor availability API returns random availability
- [ ] GoalProgress component displays progress bars correctly
- [ ] RetentionNudge component shows appropriate messages
- [ ] GoalCompletionBanner displays recommendations with conversion rates

## Testing

```bash
# 1. Create a goal for test student
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "sarah-uuid",
    "goal_type": "SAT_Math",
    "target_accuracy": 0.75
  }'

# 2. Complete 20+ practice problems with 75%+ accuracy (from Phase 4)

# 3. Manually update goal to trigger completion:
UPDATE goals SET current_accuracy = 0.78, problems_completed = 25 WHERE id = 'goal-uuid';

# 4. Complete the goal:
curl -X POST http://localhost:3000/api/goals/goal-uuid/complete

# Should return recommendations for SAT_Verbal, College_Essays, etc.

# 5. Test retention nudge:
# Set student signup_date to 6 days ago with session_count = 2
UPDATE students SET signup_date = NOW() - INTERVAL '6 days', session_count = 2 WHERE id = 'sarah-uuid';

curl http://localhost:3000/api/retention/check?student_id=sarah-uuid

# Should return needs_nudge = true, type = low_session_count

# 6. Test tutor availability:
curl http://localhost:3000/api/mock/tutor-availability

# Should return random availability status
```

## Next Phase

Phase 6 will build the complete dashboard UI that integrates goals, chat, practice, and retention features into a cohesive student experience.
