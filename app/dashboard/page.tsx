import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const student = await getCurrentStudent();

  if (!student) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Study Companion</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">{student.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-gray-600 hover:text-gray-900">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Welcome back, {student.name}!</h2>
        <p className="text-gray-600">Dashboard coming in Phase 6...</p>
      </main>
    </div>
  );
}
