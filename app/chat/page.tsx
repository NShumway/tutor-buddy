import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default async function ChatPage() {
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
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300">
              Dashboard
            </a>
            <span className="text-slate-300">{student.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-100">Chat with Your AI Companion</h2>
        <p className="text-slate-400 mb-6">
          Ask questions about your lessons, request practice problems, or get help understanding concepts.
        </p>

        <ChatInterface student_id={student.id} />
      </main>
    </div>
  );
}
