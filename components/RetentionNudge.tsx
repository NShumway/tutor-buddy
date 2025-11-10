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
    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">👋</span>
        <div className="flex-1">
          <p className="font-semibold text-yellow-200 mb-1">
            {nudge.nudge_type === 'low_session_count'
              ? 'Keep the Momentum!'
              : 'We Miss You!'}
          </p>
          <p className="text-yellow-100 text-sm mb-3">{nudge.message}</p>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm">
            {nudge.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
