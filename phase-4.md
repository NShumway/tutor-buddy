# Phase 4: Practice Mode + Adaptive Logic

**Goal**: Build a practice problem system with adaptive selection based on student performance. Problems are served from a mock problem bank and adjusted based on category accuracy.

**Duration**: ~2 days

## Requirements

1. Create mock problem bank (JSON file with categorized problems)
2. Implement adaptive practice logic (tracks accuracy per category, serves more problems in weak areas)
3. Create API endpoints to:
   - Get practice problems for a goal
   - Submit answers and check correctness
   - Calculate updated accuracy
4. Build practice UI with:
   - Problem display
   - Answer submission
   - Immediate feedback
   - Progress tracking
5. Track struggling patterns (consecutive failures) for tutor flagging

## Database Schema

Already created in Phase 1, relevant tables:

```sql
-- Practice attempts
CREATE TABLE practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  category TEXT NOT NULL, -- SAT_Math_Algebra, AP_Chem_Stoichiometry, etc.
  correct BOOLEAN NOT NULL,
  student_answer TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attempts_student_goal ON practice_attempts(student_id, goal_id, created_at DESC);
CREATE INDEX idx_attempts_category ON practice_attempts(student_id, category, created_at DESC);
```

## Mock Problem Bank Structure

**data/problems.json**
```json
{
  "SAT_Math_Algebra": [
    {
      "id": "sat_math_alg_001",
      "category": "SAT_Math_Algebra",
      "difficulty": "easy",
      "question": "If 3x + 7 = 22, what is x?",
      "options": ["3", "5", "7", "9"],
      "correct_answer": "5",
      "explanation": "Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5."
    },
    {
      "id": "sat_math_alg_002",
      "category": "SAT_Math_Algebra",
      "difficulty": "medium",
      "question": "If 2(x - 3) = 10, what is x?",
      "options": ["5", "7", "8", "11"],
      "correct_answer": "8",
      "explanation": "Divide both sides by 2: x - 3 = 5. Add 3: x = 8."
    }
  ],
  "SAT_Math_Geometry": [
    {
      "id": "sat_math_geo_001",
      "category": "SAT_Math_Geometry",
      "difficulty": "easy",
      "question": "What is the area of a rectangle with length 8 and width 5?",
      "options": ["13", "26", "40", "48"],
      "correct_answer": "40",
      "explanation": "Area = length × width = 8 × 5 = 40."
    }
  ],
  "AP_Chem_Stoichiometry": [
    {
      "id": "ap_chem_sto_001",
      "category": "AP_Chem_Stoichiometry",
      "difficulty": "medium",
      "question": "How many moles of O₂ are needed to react with 2 moles of H₂ in 2H₂ + O₂ → 2H₂O?",
      "options": ["0.5", "1", "2", "4"],
      "correct_answer": "1",
      "explanation": "The stoichiometric ratio is 2:1 for H₂:O₂. So 2 moles H₂ needs 1 mole O₂."
    }
  ]
}
```

## API Endpoints

### GET /api/practice/problems

Returns practice problems for a goal using adaptive selection.

**Query params:**
- `goal_id`: UUID
- `count`: number (default 5)

**Response:**
```json
{
  "problems": [
    {
      "id": "sat_math_alg_001",
      "category": "SAT_Math_Algebra",
      "difficulty": "easy",
      "question": "If 3x + 7 = 22, what is x?",
      "options": ["3", "5", "7", "9"]
    }
  ],
  "adaptive_info": {
    "weak_categories": ["SAT_Math_Algebra"],
    "problem_distribution": {
      "SAT_Math_Algebra": 4,
      "SAT_Math_Geometry": 1
    }
  }
}
```

### POST /api/practice/submit

Submits an answer, checks correctness, updates stats.

**Request:**
```json
{
  "student_id": "uuid",
  "goal_id": "uuid",
  "problem_id": "sat_math_alg_001",
  "category": "SAT_Math_Algebra",
  "answer": "5",
  "time_spent_seconds": 45
}
```

**Response:**
```json
{
  "correct": true,
  "explanation": "Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.",
  "updated_accuracy": {
    "overall": 0.78,
    "category": 0.80
  },
  "consecutive_failures": 0,
  "needs_tutor_flag": false
}
```

### GET /api/practice/stats

Gets practice statistics for a student/goal.

**Query params:**
- `student_id`: UUID
- `goal_id`: UUID (optional)

**Response:**
```json
{
  "overall": {
    "total_attempts": 50,
    "correct": 38,
    "accuracy": 0.76
  },
  "by_category": {
    "SAT_Math_Algebra": {
      "total": 25,
      "correct": 18,
      "accuracy": 0.72
    },
    "SAT_Math_Geometry": {
      "total": 25,
      "correct": 20,
      "accuracy": 0.80
    }
  }
}
```

## Implementation Steps

### 1. Create Problem Bank Data File

Create a `data/` directory and add `problems.json` with at least 20 problems across 3-4 categories. Use the structure shown above.

### 2. Create Practice Utility

**lib/practice.ts**
```typescript
import { supabaseAdmin } from './supabase';
import problemsData from '@/data/problems.json';

export interface Problem {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface CategoryStats {
  category: string;
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * Gets all problems for a category
 */
export function getProblemsByCategory(category: string): Problem[] {
  return (problemsData as any)[category] || [];
}

/**
 * Gets a single problem by ID
 */
export function getProblemById(problemId: string): Problem | null {
  for (const category of Object.keys(problemsData)) {
    const problems = (problemsData as any)[category] as Problem[];
    const problem = problems.find((p) => p.id === problemId);
    if (problem) return problem;
  }
  return null;
}

/**
 * Calculates accuracy stats per category for a student/goal
 */
export async function getCategoryStats(
  student_id: string,
  goal_id: string
): Promise<CategoryStats[]> {
  const { data, error } = await supabaseAdmin
    .from('practice_attempts')
    .select('category, correct')
    .eq('student_id', student_id)
    .eq('goal_id', goal_id);

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  // Group by category
  const categoryMap = new Map<string, { total: number; correct: number }>();

  for (const attempt of data || []) {
    const stats = categoryMap.get(attempt.category) || { total: 0, correct: 0 };
    stats.total++;
    if (attempt.correct) stats.correct++;
    categoryMap.set(attempt.category, stats);
  }

  // Convert to array with accuracy
  return Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
  }));
}

/**
 * Adaptive problem selection: prioritize weak categories
 */
export async function getAdaptiveProblems(
  goal_id: string,
  student_id: string,
  count: number = 5
): Promise<{ problems: Problem[]; weak_categories: string[] }> {
  // 1. Get goal to determine relevant categories
  const { data: goal } = await supabaseAdmin
    .from('goals')
    .select('goal_type')
    .eq('id', goal_id)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

  // 2. Determine categories for this goal type
  const goalCategories = getCategoriesForGoalType(goal.goal_type);

  // 3. Get category stats
  const stats = await getCategoryStats(student_id, goal_id);

  // 4. Identify weak categories (< 75% accuracy or < 10 attempts)
  const weakCategories = stats
    .filter((s) => s.accuracy < 0.75 || s.total < 10)
    .map((s) => s.category);

  // Also include categories with no attempts yet
  for (const cat of goalCategories) {
    if (!stats.find((s) => s.category === cat)) {
      weakCategories.push(cat);
    }
  }

  // 5. Select problems: 70% from weak categories, 30% from all
  const weakCount = Math.ceil(count * 0.7);
  const regularCount = count - weakCount;

  const selectedProblems: Problem[] = [];

  // Get weak category problems
  if (weakCategories.length > 0) {
    for (let i = 0; i < weakCount; i++) {
      const category = weakCategories[i % weakCategories.length];
      const categoryProblems = getProblemsByCategory(category);
      if (categoryProblems.length > 0) {
        const randomProblem =
          categoryProblems[Math.floor(Math.random() * categoryProblems.length)];
        selectedProblems.push(randomProblem);
      }
    }
  }

  // Get regular problems from all categories
  for (let i = 0; i < regularCount; i++) {
    const category = goalCategories[i % goalCategories.length];
    const categoryProblems = getProblemsByCategory(category);
    if (categoryProblems.length > 0) {
      const randomProblem =
        categoryProblems[Math.floor(Math.random() * categoryProblems.length)];
      selectedProblems.push(randomProblem);
    }
  }

  return {
    problems: selectedProblems,
    weak_categories: weakCategories,
  };
}

/**
 * Maps goal types to their relevant categories
 */
function getCategoriesForGoalType(goalType: string): string[] {
  const mapping: Record<string, string[]> = {
    SAT_Math: ['SAT_Math_Algebra', 'SAT_Math_Geometry', 'SAT_Math_Statistics'],
    AP_Chemistry: ['AP_Chem_Stoichiometry', 'AP_Chem_Equilibrium', 'AP_Chem_Acids_Bases'],
    // Add more mappings as needed
  };

  return mapping[goalType] || [];
}

/**
 * Checks if student is struggling (3+ consecutive failures in same category)
 */
export async function checkConsecutiveFailures(
  student_id: string,
  category: string
): Promise<number> {
  const { data } = await supabaseAdmin
    .from('practice_attempts')
    .select('correct')
    .eq('student_id', student_id)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return 0;

  let consecutive = 0;
  for (const attempt of data) {
    if (!attempt.correct) {
      consecutive++;
    } else {
      break;
    }
  }

  return consecutive;
}
```

### 3. Create Practice Problems API

**app/api/practice/problems/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdaptiveProblems } from '@/lib/practice';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const goal_id = searchParams.get('goal_id');
  const student_id = searchParams.get('student_id');
  const count = parseInt(searchParams.get('count') || '5');

  if (!goal_id || !student_id) {
    return NextResponse.json(
      { error: 'Missing goal_id or student_id' },
      { status: 400 }
    );
  }

  try {
    const { problems, weak_categories } = await getAdaptiveProblems(
      goal_id,
      student_id,
      count
    );

    // Remove correct_answer and explanation from response
    const sanitizedProblems = problems.map((p) => ({
      id: p.id,
      category: p.category,
      difficulty: p.difficulty,
      question: p.question,
      options: p.options,
    }));

    return NextResponse.json({
      problems: sanitizedProblems,
      adaptive_info: {
        weak_categories,
      },
    });
  } catch (error: any) {
    console.error('Problems error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 4. Create Submit Answer API

**app/api/practice/submit/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getProblemById, checkConsecutiveFailures, getCategoryStats } from '@/lib/practice';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, goal_id, problem_id, category, answer, time_spent_seconds } = body;

    if (!student_id || !goal_id || !problem_id || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get problem
    const problem = getProblemById(problem_id);
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    // Check if correct
    const correct = answer === problem.correct_answer;

    // Save attempt
    await supabaseAdmin.from('practice_attempts').insert({
      student_id,
      goal_id,
      problem_id,
      category,
      correct,
      student_answer: answer,
      time_spent_seconds,
    });

    // Update goal accuracy
    const stats = await getCategoryStats(student_id, goal_id);
    const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0);
    const totalAttempts = stats.reduce((sum, s) => sum + s.total, 0);
    const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    await supabaseAdmin
      .from('goals')
      .update({
        current_accuracy: overallAccuracy,
        problems_completed: totalAttempts,
      })
      .eq('id', goal_id);

    // Check for consecutive failures
    const consecutiveFailures = await checkConsecutiveFailures(student_id, category);
    const needsTutorFlag = consecutiveFailures >= 3;

    // Create tutor flag if needed
    if (needsTutorFlag) {
      await supabaseAdmin.from('tutor_flags').insert({
        student_id,
        flag_type: 'struggling',
        category,
        message: `Student failed ${consecutiveFailures} consecutive ${category} problems`,
        resolved: false,
      });
    }

    // Get category-specific accuracy
    const categoryStats = stats.find((s) => s.category === category);

    return NextResponse.json({
      correct,
      explanation: problem.explanation,
      updated_accuracy: {
        overall: overallAccuracy,
        category: categoryStats?.accuracy || 0,
      },
      consecutive_failures: consecutiveFailures,
      needs_tutor_flag: needsTutorFlag,
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 5. Create Practice Stats API

**app/api/practice/stats/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats } from '@/lib/practice';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const goal_id = searchParams.get('goal_id');

  if (!student_id || !goal_id) {
    return NextResponse.json(
      { error: 'Missing student_id or goal_id' },
      { status: 400 }
    );
  }

  try {
    const stats = await getCategoryStats(student_id, goal_id);

    const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0);
    const totalAttempts = stats.reduce((sum, s) => sum + s.total, 0);

    return NextResponse.json({
      overall: {
        total_attempts: totalAttempts,
        correct: totalCorrect,
        accuracy: totalAttempts > 0 ? totalCorrect / totalAttempts : 0,
      },
      by_category: stats.reduce((acc, s) => {
        acc[s.category] = {
          total: s.total,
          correct: s.correct,
          accuracy: s.accuracy,
        };
        return acc;
      }, {} as Record<string, any>),
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 6. Create Practice UI Component

**components/PracticeMode.tsx**
```typescript
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
    return <div>Loading problems...</div>;
  }

  const currentProblem = problems[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between text-sm text-gray-600">
        <span>
          Problem {currentIndex + 1} of {problems.length}
        </span>
        <span className="capitalize">{currentProblem.category.replace(/_/g, ' ')}</span>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{currentProblem.question}</h3>

        <div className="space-y-2 mb-6">
          {currentProblem.options.map((option) => (
            <button
              key={option}
              onClick={() => !feedback && setSelectedAnswer(option)}
              disabled={!!feedback}
              className={`w-full text-left px-4 py-3 border rounded-lg transition-colors ${
                selectedAnswer === option
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${feedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              feedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
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
            className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            {currentIndex < problems.length - 1 ? 'Next Problem' : 'Start New Set'}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 7. Create Practice Page

**app/practice/page.tsx**
```typescript
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Practice Mode</h1>
          <p>No active goals found. Please create a goal first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Practice Mode</h1>
          <a href="/dashboard" className="text-blue-600 hover:underline">
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
```

## Acceptance Criteria

- [ ] Problem bank JSON file has at least 20 problems across 3+ categories
- [ ] GET /api/practice/problems returns adaptive problem selection
- [ ] Weak categories get 70% of problems
- [ ] POST /api/practice/submit correctly checks answers
- [ ] Practice attempts are saved to database
- [ ] Goal accuracy is updated after each attempt
- [ ] Consecutive failures (3+) create tutor flags
- [ ] Practice UI displays problems with multiple choice options
- [ ] Immediate feedback shows correct/incorrect with explanation
- [ ] Progress counter shows current problem number
- [ ] Stats API returns accuracy by category

## Testing

```bash
# 1. Create a goal for your test student
INSERT INTO goals (student_id, goal_type, status)
VALUES ('sarah-uuid', 'SAT_Math', 'active');

# 2. Visit http://localhost:3000/practice

# 3. Complete 10 problems, intentionally failing algebra questions

# 4. Verify adaptive selection:
# - Next set should have mostly algebra problems

# 5. Fail 3+ problems in same category

# 6. Check tutor_flags table:
SELECT * FROM tutor_flags WHERE student_id = 'sarah-uuid';
# Should see a 'struggling' flag

# 7. Check stats API:
curl http://localhost:3000/api/practice/stats?student_id=sarah-uuid&goal_id=goal-uuid

# Should show accuracy breakdown by category
```

## Next Phase

Phase 5 will implement goal tracking, completion detection, and retention triggers (suggesting related goals, nudging inactive students).
