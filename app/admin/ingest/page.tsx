'use client';

import { useState, useEffect } from 'react';

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function IngestTestPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents(search = '') {
    setLoadingStudents(true);
    try {
      const url = search
        ? `/api/students?search=${encodeURIComponent(search)}`
        : '/api/students';
      const res = await fetch(url);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchStudents(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleStudentSelect(student: Student) {
    setSelectedStudent(student);
    setSearchQuery('');
    setShowDropdown(false);
  }

  async function handleIngest() {
    if (!selectedStudent) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/sessions/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
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

  const filteredStudents = searchQuery
    ? students
    : students;

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-slate-100">Test Transcript Ingestion</h1>

        <div className="space-y-4">
          {/* Student Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1 text-slate-300">Student</label>

            {selectedStudent ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 border border-slate-600 rounded bg-slate-700 text-slate-100">
                  {selectedStudent.name} ({selectedStudent.email})
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-2 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 border border-slate-600"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-slate-100 focus:border-blue-500 focus:outline-none"
                  placeholder="Search by name or email..."
                />

                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {loadingStudents ? (
                      <div className="px-3 py-2 text-slate-400">Loading students...</div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="px-3 py-2 text-slate-400">No students found</div>
                    ) : (
                      filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-700 text-slate-100 border-b border-slate-700 last:border-b-0"
                        >
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-slate-400">{student.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Transcript Input */}
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-300">Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-3 py-2 border border-slate-600 rounded bg-slate-700 text-slate-100 h-64 focus:border-blue-500 focus:outline-none"
              placeholder="Paste transcript here..."
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleIngest}
            disabled={loading || !selectedStudent || !transcript}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Ingesting...' : 'Ingest Transcript'}
          </button>

          {/* Result Display */}
          {result && (
            <div className="mt-4 p-4 bg-slate-800 rounded border border-slate-700">
              <pre className="text-sm text-slate-200 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
