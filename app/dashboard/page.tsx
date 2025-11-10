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
          <h2 className="text-3xl font-bold mb-2 text-slate-100">Welcome back, {student.name.split(' ')[0]}!</h2>
          <p className="text-slate-400">Here's your learning progress</p>
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
