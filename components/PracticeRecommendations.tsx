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
    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6">
      <h3 className="font-semibold text-blue-300 mb-4">📚 Recommended Practice</h3>
      <p className="text-blue-200 text-sm mb-4">
        Focus on these areas to improve your performance:
      </p>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center border border-slate-700">
            <div>
              <p className="font-medium text-slate-100">{rec.category.replace(/_/g, ' ')}</p>
              <p className="text-sm text-slate-400">
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
