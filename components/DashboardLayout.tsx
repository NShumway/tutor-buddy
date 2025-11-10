import Link from 'next/link';
import { Student } from '@/types';

interface DashboardLayoutProps {
  student: Student;
  children: React.ReactNode;
}

export default function DashboardLayout({ student, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-blue-400">AI Study Companion</h1>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/dashboard"
                className="text-slate-300 hover:text-blue-400 font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/practice"
                className="text-slate-300 hover:text-blue-400 font-medium transition-colors"
              >
                Practice
              </Link>
              <Link
                href="/chat"
                className="text-slate-300 hover:text-blue-400 font-medium transition-colors"
              >
                Chat
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-200">{student.name}</span>
            <form action="/api/auth/logout" method="POST">
              <button className="text-sm text-slate-300 hover:text-slate-100 px-3 py-1 border border-slate-600 rounded hover:border-slate-500 transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
