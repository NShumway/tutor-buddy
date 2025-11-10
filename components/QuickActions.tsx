import Link from 'next/link';

export default function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Link
        href="/chat"
        className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 hover:border-blue-500 transition-all"
      >
        <div className="text-4xl mb-3">💬</div>
        <h3 className="font-semibold mb-2 text-slate-100">Ask AI</h3>
        <p className="text-sm text-slate-400">
          Get help understanding concepts from your sessions
        </p>
      </Link>

      <Link
        href="/practice"
        className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 hover:border-blue-500 transition-all"
      >
        <div className="text-4xl mb-3">✏️</div>
        <h3 className="font-semibold mb-2 text-slate-100">Practice</h3>
        <p className="text-sm text-slate-400">
          Solve problems and improve your accuracy
        </p>
      </Link>

      <Link
        href="/admin/ingest"
        className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700 hover:border-blue-500 transition-all"
      >
        <div className="text-4xl mb-3">📚</div>
        <h3 className="font-semibold mb-2 text-slate-100">Add Session</h3>
        <p className="text-sm text-slate-400">
          Upload a new tutoring session transcript
        </p>
      </Link>
    </div>
  );
}
