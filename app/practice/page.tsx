import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PracticeMode from '@/components/PracticeMode';
import { supabaseAdmin } from '@/lib/supabase';

export default async function PracticePage({
  searchParams,
}: {
  searchParams: { goal_id?: string };
}) {
  const student = await getCurrentStudent();

  if (!student) {
    redirect('/login');
  }

  // Get student's active goals
  const { data: goals } = await supabaseAdmin
    .from('goals')
    .select('*')
    .eq('student_id', student.id)
    .eq('status', 'active');

  const selectedGoalId = searchParams.goal_id || goals?.[0]?.id;

  if (!selectedGoalId) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-slate-100">Practice Mode</h1>
          <p className="text-slate-300">No active goals found. Please create a goal first.</p>
          <a href="/dashboard" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100">Practice Mode</h1>
          <a href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <PracticeMode student_id={student.id} goal_id={selectedGoalId} />
      </main>
    </div>
  );
}
