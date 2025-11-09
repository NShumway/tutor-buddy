# Phase 6: Dashboard UI

**Goal**: Build a comprehensive student dashboard that integrates all features - goals overview, chat widget, practice recommendations, retention nudges, and session history.

**Duration**: ~2 days

## Requirements

1. Create main dashboard layout with navigation
2. Build dashboard homepage with:
   - Retention nudges (if applicable)
   - Goal completion banners (if applicable)
   - Goals overview (all active and recent completed goals)
   - Quick access to chat and practice
   - Recent activity feed
3. Create session history view
4. Add practice recommendations based on weak categories
5. Build responsive layout (mobile-friendly)
6. Add loading states and error handling

## Components to Build

### Layout Components

1. **DashboardLayout** - Main layout with header, nav, content
2. **Header** - Logo, user info, navigation, logout
3. **Sidebar** - Quick links to features

### Dashboard Components

4. **DashboardHome** - Main dashboard page
5. **GoalsOverview** - Grid of goal progress cards
6. **RecentActivity** - Timeline of recent actions
7. **PracticeRecommendations** - Suggested practice based on stats
8. **SessionHistory** - List of past tutoring sessions
9. **QuickActions** - Buttons for chat, practice, new goal

### Feature Integration

10. **EmbeddedChat** - Compact chat widget on dashboard
11. **StatsSummary** - Overall progress metrics

## Implementation Steps

### 1. Create Dashboard Layout Component

**components/DashboardLayout.tsx**
```typescript
import Link from 'next/link';
import { Student } from '@/types';

interface DashboardLayoutProps {
  student: Student;
  children: React.ReactNode;
}

export default function DashboardLayout({ student, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-blue-600">AI Study Companion</h1>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/practice"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Practice
              </Link>
              <Link
                href="/chat"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Chat
              </Link>
              <Link
                href="/sessions"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Sessions
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-700">{student.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border rounded">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

### 2. Create Goals Overview Component

**components/GoalsOverview.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';
import GoalProgress from './GoalProgress';
import { Goal } from '@/types';

interface GoalsOverviewProps {
  student_id: string;
}

export default function GoalsOverview({ student_id }: GoalsOverviewProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, [student_id]);

  async function loadGoals() {
    try {
      const res = await fetch(`/api/goals?student_id=${student_id}`);
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading goals...</div>;
  }

  if (goals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">No active goals yet</h3>
        <p className="text-gray-600 mb-4">
          Create your first learning goal to get started!
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Goal
        </button>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed').slice(0, 3);

  return (
    <div>
      {activeGoals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Active Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => (
              <GoalProgress key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Recently Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <GoalProgress key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Create Recent Activity Component

**components/RecentActivity.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';

interface RecentActivityProps {
  student_id: string;
}

interface Activity {
  type: 'session' | 'practice' | 'chat' | 'goal';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export default function RecentActivity({ student_id }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [student_id]);

  async function loadActivities() {
    try {
      // Fetch recent activities from multiple sources
      const [sessionsRes, attemptsRes, goalsRes] = await Promise.all([
        fetch(`/api/sessions?student_id=${student_id}&limit=3`),
        fetch(`/api/practice/recent?student_id=${student_id}&limit=5`),
        fetch(`/api/goals?student_id=${student_id}&status=completed`),
      ]);

      // Combine and sort activities
      const activities: Activity[] = [];

      // Add sessions
      const sessions = await sessionsRes.json();
      sessions.sessions?.forEach((s: any) => {
        activities.push({
          type: 'session',
          title: 'Tutoring Session',
          description: `${s.duration_minutes || 60} minute session`,
          timestamp: s.session_date,
          icon: '👨‍🏫',
        });
      });

      // Add practice attempts
      const attempts = await attemptsRes.json();
      if (attempts.recent) {
        const groupedAttempts = groupPracticeAttempts(attempts.recent);
        groupedAttempts.forEach((g) => {
          activities.push({
            type: 'practice',
            title: 'Practice Session',
            description: `Completed ${g.count} ${g.category} problems`,
            timestamp: g.timestamp,
            icon: '✏️',
          });
        });
      }

      // Add completed goals
      const goals = await goalsRes.json();
      goals.goals?.slice(0, 2).forEach((g: any) => {
        activities.push({
          type: 'goal',
          title: 'Goal Completed!',
          description: g.goal_type.replace(/_/g, ' '),
          timestamp: g.completed_at,
          icon: '🎉',
        });
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activities.slice(0, 8));
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  function groupPracticeAttempts(attempts: any[]) {
    // Group attempts by hour and category
    const groups = new Map<string, { count: number; category: string; timestamp: string }>();

    attempts.forEach((a) => {
      const hour = new Date(a.created_at).toISOString().slice(0, 13);
      const key = `${hour}-${a.category}`;

      if (groups.has(key)) {
        groups.get(key)!.count++;
      } else {
        groups.set(key, {
          count: 1,
          category: a.category.replace(/_/g, ' '),
          timestamp: a.created_at,
        });
      }
    });

    return Array.from(groups.values());
  }

  if (loading) {
    return <div className="text-center py-4">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600">No recent activity yet. Start learning!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Recent Activity</h3>
      </div>
      <div className="divide-y">
        {activities.map((activity, idx) => (
          <div key={idx} className="p-4 flex gap-3 hover:bg-gray-50">
            <span className="text-2xl">{activity.icon}</span>
            <div className="flex-1">
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-gray-600">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Create Practice Recommendations Component

**components/PracticeRecommendations.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PracticeRecommendationsProps {
  student_id: string;
}

export default function PracticeRecommendations({ student_id }: PracticeRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, [student_id]);

  async function loadRecommendations() {
    try {
      // Get all active goals
      const goalsRes = await fetch(`/api/goals?student_id=${student_id}&status=active`);
      const goalsData = await goalsRes.json();

      const recs = [];

      for (const goal of goalsData.goals || []) {
        // Get stats for this goal
        const statsRes = await fetch(
          `/api/practice/stats?student_id=${student_id}&goal_id=${goal.id}`
        );
        const stats = await statsRes.json();

        // Find weak categories (< 75% accuracy)
        const weakCategories = Object.entries(stats.by_category || {})
          .filter(([_, s]: any) => s.accuracy < 0.75 && s.total >= 3)
          .map(([cat, s]: any) => ({
            goal_id: goal.id,
            goal_type: goal.goal_type,
            category: cat,
            accuracy: s.accuracy,
            total: s.total,
          }));

        recs.push(...weakCategories);
      }

      // Sort by accuracy (lowest first)
      recs.sort((a, b) => a.accuracy - b.accuracy);

      setRecommendations(recs.slice(0, 3));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="font-semibold text-blue-900 mb-4">📚 Recommended Practice</h3>
      <p className="text-blue-800 text-sm mb-4">
        Focus on these areas to improve your performance:
      </p>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="bg-white p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-medium">{rec.category.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-600">
                Current accuracy: {Math.round(rec.accuracy * 100)}% ({rec.total} attempts)
              </p>
            </div>
            <Link
              href={`/practice?goal_id=${rec.goal_id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Practice
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5. Create Quick Actions Component

**components/QuickActions.tsx**
```typescript
import Link from 'next/link';

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link
        href="/chat"
        className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <div className="text-4xl mb-3">💬</div>
        <h3 className="font-semibold mb-2">Ask AI</h3>
        <p className="text-sm text-gray-600">
          Get help understanding concepts from your sessions
        </p>
      </Link>

      <Link
        href="/practice"
        className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <div className="text-4xl mb-3">✏️</div>
        <h3 className="font-semibold mb-2">Practice</h3>
        <p className="text-sm text-gray-600">
          Solve problems and improve your accuracy
        </p>
      </Link>

      <Link
        href="/sessions"
        className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        <div className="text-4xl mb-3">📚</div>
        <h3 className="font-semibold mb-2">My Sessions</h3>
        <p className="text-sm text-gray-600">
          Review your past tutoring sessions
        </p>
      </Link>
    </div>
  );
}
```

### 6. Create Stats Summary Component

**components/StatsSummary.tsx**
```typescript
'use client';

import { useEffect, useState } from 'react';

interface StatsSummaryProps {
  student_id: string;
}

export default function StatsSummary({ student_id }: StatsSummaryProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [student_id]);

  async function loadStats() {
    try {
      // Get overall stats
      const [goalsRes, attemptsRes, messagesRes] = await Promise.all([
        fetch(`/api/goals?student_id=${student_id}`),
        fetch(`/api/practice/stats?student_id=${student_id}`),
        fetch(`/api/chat/history?student_id=${student_id}&limit=1000`),
      ]);

      const goals = await goalsRes.json();
      const attempts = await attemptsRes.json();
      const messages = await messagesRes.json();

      setStats({
        activeGoals: goals.goals?.filter((g: any) => g.status === 'active').length || 0,
        completedGoals: goals.goals?.filter((g: any) => g.status === 'completed').length || 0,
        totalProblems: attempts.overall?.total_attempts || 0,
        overallAccuracy: attempts.overall?.accuracy || 0,
        chatMessages: messages.messages?.filter((m: any) => m.role === 'user').length || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white p-4 rounded-lg shadow text-center">
        <div className="text-3xl font-bold text-blue-600">{stats.activeGoals}</div>
        <div className="text-sm text-gray-600">Active Goals</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow text-center">
        <div className="text-3xl font-bold text-green-600">{stats.completedGoals}</div>
        <div className="text-sm text-gray-600">Completed</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow text-center">
        <div className="text-3xl font-bold text-purple-600">{stats.totalProblems}</div>
        <div className="text-sm text-gray-600">Problems Solved</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow text-center">
        <div className="text-3xl font-bold text-orange-600">
          {Math.round(stats.overallAccuracy * 100)}%
        </div>
        <div className="text-sm text-gray-600">Accuracy</div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow text-center">
        <div className="text-3xl font-bold text-pink-600">{stats.chatMessages}</div>
        <div className="text-sm text-gray-600">Questions Asked</div>
      </div>
    </div>
  );
}
```

### 7. Create Session History API

**app/api/sessions/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('tutoring_sessions')
      .select('id, session_date, duration_minutes, created_at')
      .eq('student_id', student_id)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (error: any) {
    console.error('Sessions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 8. Update Dashboard Page

**app/dashboard/page.tsx**
```typescript
import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import RetentionNudge from '@/components/RetentionNudge';
import GoalsOverview from '@/components/GoalsOverview';
import QuickActions from '@/components/QuickActions';
import StatsSummary from '@/components/StatsSummary';
import PracticeRecommendations from '@/components/PracticeRecommendations';
import RecentActivity from '@/components/RecentActivity';

export default async function DashboardPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect('/login');
  }

  return (
    <DashboardLayout student={student}>
      <div className="space-y-6">
        {/* Welcome header */}
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome back, {student.name.split(' ')[0]}!</h2>
          <p className="text-gray-600">Here's your learning progress</p>
        </div>

        {/* Retention nudge */}
        <RetentionNudge student_id={student.id} />

        {/* Stats summary */}
        <StatsSummary student_id={student.id} />

        {/* Quick actions */}
        <QuickActions />

        {/* Practice recommendations */}
        <PracticeRecommendations student_id={student.id} />

        {/* Goals overview */}
        <GoalsOverview student_id={student.id} />

        {/* Recent activity */}
        <RecentActivity student_id={student.id} />
      </div>
    </DashboardLayout>
  );
}
```

## Acceptance Criteria

- [ ] Dashboard displays welcome message with student name
- [ ] Retention nudges appear when applicable
- [ ] Stats summary shows accurate counts
- [ ] Goals overview displays all active and completed goals
- [ ] Practice recommendations suggest weak categories
- [ ] Recent activity shows timeline of actions
- [ ] Quick actions link to chat, practice, and sessions
- [ ] Layout is responsive on mobile and desktop
- [ ] Navigation header works correctly
- [ ] All components load data asynchronously with loading states
- [ ] Error states are handled gracefully

## Testing

```bash
# 1. Ensure test student has:
# - At least 2 active goals
# - Completed some practice problems
# - Has chat history
# - Has tutoring sessions

# 2. Visit http://localhost:3000/dashboard

# 3. Verify all sections render:
# - Stats summary with accurate numbers
# - Quick actions (3 cards)
# - Goals overview showing progress bars
# - Recent activity timeline
# - Practice recommendations (if weak categories exist)

# 4. Test retention nudge:
# - Set student to have 2 sessions, signed up 6 days ago
# - Should see yellow nudge banner

# 5. Test navigation:
# - Click chat, practice, sessions links
# - Should navigate correctly
# - Click logout, should return to login

# 6. Test responsive design:
# - Resize browser to mobile width
# - Layout should stack vertically
# - Navigation should remain accessible
```

## Next Phase

Phase 7 will seed the database with comprehensive mock data and deploy the application to Vercel for production use.
