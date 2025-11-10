import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-100">AI Study Companion</h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-300">{student.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-slate-400 hover:text-slate-200">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">Welcome back, {student.name}!</h2>
        <p className="text-slate-400">Dashboard coming in Phase 6...</p>
      </main>
    </div>
  );
}
