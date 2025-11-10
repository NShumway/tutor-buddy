'use client';

import { useState, useEffect } from 'react';

interface Problem {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
}

interface PracticeModeProps {
  student_id: string;
  goal_id: string;
}

export default function PracticeMode({ student_id, goal_id }: PracticeModeProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    loadProblems();
  }, []);

  async function loadProblems() {
    try {
      const res = await fetch(
        `/api/practice/problems?goal_id=${goal_id}&student_id=${student_id}&count=5`
      );
      const data = await res.json();
      setProblems(data.problems || []);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load problems:', error);
    }
  }

  async function submitAnswer() {
    if (!selectedAnswer) return;

    setLoading(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id,
          goal_id,
          problem_id: problems[currentIndex].id,
          category: problems[currentIndex].category,
          answer: selectedAnswer,
          time_spent_seconds: timeSpent,
        }),
      });

      const data = await res.json();
      setFeedback(data);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  }

  function nextProblem() {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setStartTime(Date.now());
    } else {
      // All problems done
      loadProblems();
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setFeedback(null);
    }
  }

  if (problems.length === 0) {
    return <div className="text-slate-300">Loading problems...</div>;
  }

  const currentProblem = problems[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between text-sm text-slate-400">
        <span>
          Problem {currentIndex + 1} of {problems.length}
        </span>
        <span className="capitalize">{currentProblem.category.replace(/_/g, ' ')}</span>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg shadow-xl border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">{currentProblem.question}</h3>

        <div className="space-y-2 mb-6">
          {currentProblem.options.map((option) => (
            <button
              key={option}
              onClick={() => !feedback && setSelectedAnswer(option)}
              disabled={!!feedback}
              className={`w-full text-left px-4 py-3 border rounded-lg transition-colors text-slate-100 ${
                selectedAnswer === option
                  ? 'border-blue-600 bg-blue-900/30'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
              } ${feedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              feedback.correct ? 'bg-green-900/30 text-green-200 border border-green-700' : 'bg-red-900/30 text-red-200 border border-red-700'
            }`}
          >
            <p className="font-semibold mb-2">
              {feedback.correct ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p className="text-sm">{feedback.explanation}</p>
            {feedback.needs_tutor_flag && (
              <p className="mt-2 text-sm font-semibold">
                ⚠️ Struggling with this topic? Consider booking a tutor session.
              </p>
            )}
          </div>
        )}

        {!feedback ? (
          <button
            onClick={submitAnswer}
            disabled={!selectedAnswer || loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Submit Answer'}
          </button>
        ) : (
          <button
            onClick={nextProblem}
            className="w-full py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            {currentIndex < problems.length - 1 ? 'Next Problem' : 'Start New Set'}
          </button>
        )}
      </div>
    </div>
  );
}
