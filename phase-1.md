# Phase 1: Foundation

**Goal**: Set up the core infrastructure - Next.js project, Supabase database with schema, and mock authentication system.

**Duration**: ~2 days

## Requirements

1. Initialize Next.js 14 project with TypeScript and App Router
2. Configure Supabase project with pgvector extension
3. Create complete database schema with all tables
4. Implement mock authentication system (login, logout, session management)
5. Set up Supabase client utilities
6. Create basic layout and routing structure

## Database Schema

All tables needed for the entire project:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  signup_date TIMESTAMP DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,
  primary_tutor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tutoring sessions
CREATE TABLE tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  session_date TIMESTAMP NOT NULL,
  transcript TEXT NOT NULL,
  duration_minutes INTEGER,
  tutor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session embeddings for RAG
CREATE TABLE session_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536), -- text-embedding-3-small dimension
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX ON session_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Learning goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL, -- SAT_Math, AP_Chemistry, etc.
  status TEXT DEFAULT 'active', -- active, completed, paused
  target_accuracy DECIMAL DEFAULT 0.75,
  current_accuracy DECIMAL DEFAULT 0.0,
  problems_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Practice attempts
CREATE TABLE practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  category TEXT NOT NULL, -- SAT_Math_Algebra, etc.
  correct BOOLEAN NOT NULL,
  student_answer TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tutor flags for struggling students
CREATE TABLE tutor_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID,
  flag_type TEXT NOT NULL, -- struggling, inactive, at_risk
  category TEXT,
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_sessions_student ON tutoring_sessions(student_id, session_date DESC);
CREATE INDEX idx_embeddings_student ON session_embeddings(student_id);
CREATE INDEX idx_goals_student ON goals(student_id, status);
CREATE INDEX idx_attempts_student_goal ON practice_attempts(student_id, goal_id, created_at DESC);
CREATE INDEX idx_attempts_category ON practice_attempts(student_id, category, created_at DESC);
CREATE INDEX idx_chat_student ON chat_messages(student_id, created_at DESC);
CREATE INDEX idx_flags_unresolved ON tutor_flags(student_id, resolved) WHERE resolved = FALSE;
```

## API Endpoints

### Authentication APIs

**POST /api/auth/login**
- Accepts email and password (mock - any password works)
- Returns student object and mock JWT token
- Sets httpOnly cookie with session

**POST /api/auth/logout**
- Clears session cookie
- Returns success

**GET /api/auth/me**
- Returns current logged-in student
- Used for session validation

## Frontend Components

### Layout Components

**app/layout.tsx**
- Root layout with global styles
- Wraps all pages

**components/Header.tsx**
- Logo, navigation links
- User name + logout button when authenticated

### Auth Pages

**app/login/page.tsx**
- Login form (email + password)
- Redirects to dashboard on success

**app/layout.tsx (middleware)**
- Checks authentication on protected routes
- Redirects to /login if not authenticated

## Implementation Steps

### 1. Initialize Next.js Project

```bash
npx create-next-app@latest tutor-buddy --typescript --tailwind --app --no-src-dir
cd tutor-buddy
npm install @supabase/supabase-js
npm install openai
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Create Supabase Client Utility

**lib/supabase.ts**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 4. Create Type Definitions

**types/index.ts**
```typescript
export interface Student {
  id: string;
  email: string;
  name: string;
  signup_date: string;
  session_count: number;
  primary_tutor_id?: string;
  created_at: string;
}

export interface TutoringSession {
  id: string;
  student_id: string;
  session_date: string;
  transcript: string;
  duration_minutes?: number;
  tutor_id?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  student_id: string;
  goal_type: string;
  status: 'active' | 'completed' | 'paused';
  target_accuracy: number;
  current_accuracy: number;
  problems_completed: number;
  created_at: string;
  completed_at?: string;
}

export interface PracticeAttempt {
  id: string;
  student_id: string;
  goal_id: string;
  problem_id: string;
  category: string;
  correct: boolean;
  student_answer?: string;
  time_spent_seconds?: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  student_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface TutorFlag {
  id: string;
  student_id: string;
  tutor_id?: string;
  flag_type: 'struggling' | 'inactive' | 'at_risk';
  category?: string;
  message?: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}
```

### 5. Implement Mock Authentication

**app/api/auth/login/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // Mock auth - find student by email (any password works)
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !student) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // Create mock session token
  const sessionToken = `mock-session-${student.id}`;

  // Set httpOnly cookie
  cookies().set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return NextResponse.json({
    success: true,
    student: {
      id: student.id,
      email: student.email,
      name: student.name,
    },
  });
}
```

**app/api/auth/logout/route.ts**
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('session');
  return NextResponse.json({ success: true });
}
```

**app/api/auth/me/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const session = cookies().get('session')?.value;

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Extract student ID from mock session token
  const studentId = session.replace('mock-session-', '');

  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ student });
}
```

### 6. Create Auth Helper Utility

**lib/auth.ts**
```typescript
import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { Student } from '@/types';

export async function getCurrentStudent(): Promise<Student | null> {
  const session = cookies().get('session')?.value;

  if (!session) {
    return null;
  }

  const studentId = session.replace('mock-session-', '');

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .single();

  return student;
}
```

### 7. Create Login Page

**app/login/page.tsx**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">AI Study Companion</h2>
          <p className="mt-2 text-center text-gray-600">Sign in to continue</p>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="student@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Any password works (mock auth)"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-gray-500 text-center">
          Mock auth: Use any email from the database with any password
        </p>
      </div>
    </div>
  );
}
```

### 8. Create Protected Route Middleware

**middleware.ts** (in root directory)
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if no session
  if (!session && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 9. Create Root Layout

**app/layout.tsx**
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Study Companion',
  description: 'Your personal AI tutor between sessions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 10. Create Placeholder Dashboard

**app/dashboard/page.tsx**
```typescript
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
```

## Acceptance Criteria

- [ ] Next.js project runs successfully (`npm run dev`)
- [ ] Supabase database has all tables created with correct schema
- [ ] pgvector extension is enabled
- [ ] Student can log in with email from database (any password)
- [ ] Session persists across page reloads
- [ ] Protected routes redirect to /login when not authenticated
- [ ] Logout clears session and redirects to login
- [ ] Dashboard shows welcome message with student name
- [ ] All environment variables are configured in `.env.local`

## Testing

```bash
# Test login with a mock student
# 1. Insert test student in Supabase:
INSERT INTO students (email, name) VALUES ('sarah@example.com', 'Sarah Johnson');

# 2. Visit http://localhost:3000
# Should redirect to /login

# 3. Login with:
# Email: sarah@example.com
# Password: anything

# 4. Should redirect to /dashboard showing "Welcome back, Sarah Johnson!"

# 5. Click logout, should return to /login
```

## Next Phase

Phase 2 will implement transcript ingestion and the vector RAG pipeline for session memory.
