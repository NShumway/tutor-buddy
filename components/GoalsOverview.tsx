'use client';

import { useEffect, useState } from 'react';
import GoalProgress from './GoalProgress';

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
    return <div className="text-center py-8 text-slate-400">Loading goals...</div>;
  }

  if (goals.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 p-8 text-center">
        <h3 className="text-lg font-semibold mb-2 text-slate-100">No active goals yet</h3>
        <p className="text-slate-400 mb-4">
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
          <h2 className="text-xl font-bold mb-4 text-slate-100">Active Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => (
              <GoalProgress key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-100">Recently Completed</h2>
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
