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
    return <div className="text-center py-4 text-slate-400">Loading stats...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 text-center">
        <div className="text-3xl font-bold text-blue-400">{stats.activeGoals}</div>
        <div className="text-sm text-slate-400">Active Goals</div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 text-center">
        <div className="text-3xl font-bold text-green-400">{stats.completedGoals}</div>
        <div className="text-sm text-slate-400">Completed</div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 text-center">
        <div className="text-3xl font-bold text-purple-400">{stats.totalProblems}</div>
        <div className="text-sm text-slate-400">Problems Solved</div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 text-center">
        <div className="text-3xl font-bold text-orange-400">
          {Math.round(stats.overallAccuracy * 100)}%
        </div>
        <div className="text-sm text-slate-400">Accuracy</div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 text-center">
        <div className="text-3xl font-bold text-pink-400">{stats.chatMessages}</div>
        <div className="text-sm text-slate-400">Questions Asked</div>
      </div>
    </div>
  );
}
