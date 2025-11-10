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
        fetch(`/api/goals?student_id=${student_id}`),
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
      goals.goals?.filter((g: any) => g.status === 'completed').slice(0, 2).forEach((g: any) => {
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
    return <div className="text-center py-4 text-slate-400">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-6 text-center">
        <p className="text-slate-400">No recent activity yet. Start learning!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-slate-100">Recent Activity</h3>
      </div>
      <div className="divide-y divide-slate-700">
        {activities.map((activity, idx) => (
          <div key={idx} className="p-4 flex gap-3 hover:bg-slate-700/50 transition-colors">
            <span className="text-2xl">{activity.icon}</span>
            <div className="flex-1">
              <p className="font-medium text-slate-100">{activity.title}</p>
              <p className="text-sm text-slate-400">{activity.description}</p>
              <p className="text-xs text-slate-500 mt-1">
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
