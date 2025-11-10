import { Goal } from '@/types';

interface GoalProgressProps {
  goal: Goal & { progress_percentage: number };
}

export default function GoalProgress({ goal }: GoalProgressProps) {
  const isCompleted = goal.status === 'completed';

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {goal.goal_type.replace(/_/g, ' ')}
          </h3>
          <p className="text-sm text-slate-400">
            Target: {Math.round(goal.target_accuracy * 100)}% accuracy
          </p>
        </div>
        {isCompleted && (
          <span className="px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full border border-green-700">
            ✓ Completed
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300">Progress</span>
          <span className="font-semibold text-slate-100">{goal.progress_percentage}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${goal.progress_percentage}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-slate-400">
        <span>
          {Math.round(goal.current_accuracy * 100)}% current accuracy
        </span>
        <span>{goal.problems_completed} problems completed</span>
      </div>
    </div>
  );
}
