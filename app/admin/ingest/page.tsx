'use client';

import { useState } from 'react';

export default function IngestTestPage() {
  const [studentId, setStudentId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleIngest() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/sessions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          transcript,
          session_date: new Date().toISOString(),
          duration_minutes: 60,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-slate-100">Test Transcript Ingestion</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded"
              placeholder="uuid"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded h-64"
              placeholder="Paste transcript here..."
            />
          </div>

          <button
            onClick={handleIngest}
            disabled={loading || !studentId || !transcript}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
          >
            {loading ? 'Ingesting...' : 'Ingest Transcript'}
          </button>

          {result && (
            <div className="mt-4 p-4 bg-slate-800 rounded border border-slate-700">
              <pre className="text-sm text-slate-200">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
