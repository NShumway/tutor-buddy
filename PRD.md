# Product Requirements Document: AI Study Companion

## Executive Summary

Build a persistent AI companion that lives between tutoring sessions to solve critical retention challenges. The system will remember previous lessons through transcript analysis, assign adaptive practice, answer questions conversationally, and drive students back to human tutors when needed.

**Target**: Working prototype deployed within 2 weeks, ROI-positive within 90 days.

## Problem Statement

### Current Challenges
1. **52% "goal achieved" churn** - Students leave after completing their initial goal (e.g., SAT prep)
2. **Early dropout risk** - Students with <3 sessions in first week rarely continue
3. **Engagement gap** - Zero interaction between tutoring sessions
4. **Single-subject tunnel vision** - Missing cross-sell opportunities

### Business Impact
- High customer acquisition cost (CAC) not recouped
- Limited lifetime value (LTV)
- Underutilized tutor capacity
- Missed revenue from adjacent subjects

## Goals & Success Metrics

### Primary Goals
- Reduce "goal achieved" churn from 52% to <30%
- Increase Week 1 session booking from <3 to 4+ sessions
- Drive 20% cross-subject enrollment
- Generate measurable learning improvements

### Success Metrics
- [ ] Working prototype deployed to cloud (Vercel/AWS)
- [ ] Functional demo with real interactions
- [ ] Solves documented business problem
- [ ] Production-ready within 2 weeks
- [ ] Sophisticated AI implementation (not just basic chatbot)
- [ ] Clear ROI path within 90 days

### Key Performance Indicators (KPIs)
- Daily active users (DAU)
- Practice problems completed per student
- Chat engagement rate
- Goal completion → related goal conversion rate
- Week 1 session count increase
- Tutor intervention success rate

## User Personas

### Primary: High School Student (Sarah)
- Age: 16
- Goal: SAT prep for college admissions
- Pain points: Forgets concepts between sessions, needs more practice, unsure what to study
- Behavior: Logs in 2-3x/week, completes practice problems, asks clarifying questions

### Secondary: Tutor (Mr. Rodriguez)
- Role: Human tutor managing 15-20 students
- Goal: Students retain information, identify struggling students early
- Pain points: Limited time, can't monitor between sessions
- Behavior: Reviews flagged students, provides targeted intervention

## Core Features

### 1. Session Memory & Context (RAG System)

**Requirement**: AI must remember and retrieve relevant information from past tutoring sessions.

**Implementation**:
- Ingest transcript text from tutoring sessions
- Chunk transcripts into semantic segments (~500 tokens)
- Generate embeddings using OpenAI `text-embedding-3-small`
- Store in Supabase pgvector
- Semantic search retrieves top-k relevant chunks per query
- Scope: Student-specific only (no cross-student retrieval)

**User Story**:
> "When Sarah asks 'What did we cover about quadratic equations?', the AI retrieves chunks from her Feb 10 session where quadratics were discussed and provides specific context."

### 2. Conversational AI Interface

**Requirement**: Students can ask questions naturally and receive helpful, context-aware responses.

**Implementation**:
- Chat interface using OpenAI `gpt-4o-mini`
- System prompt establishes role as study companion
- Retrieves relevant session context via RAG
- Maintains conversation history in database
- Encourages booking tutors for complex struggles

**User Story**:
> "Sarah types 'I'm stuck on this parabola problem' and the AI recalls her tutor's explanation method, provides a similar example, and offers to assign practice problems."

### 3. Adaptive Practice Problems

**Requirement**: System assigns problems based on student performance, focusing on weak areas.

**Implementation**:
- Mock problem bank API with categorized questions
  - Categories: SAT_Math_Algebra, SAT_Math_Geometry, AP_Chem_Stoichiometry, etc.
  - Each problem has: id, category, difficulty, question_text, correct_answer
- Track accuracy per category per student
- Serve more problems from categories with <75% accuracy
- Simple adaptive logic (no spaced repetition in MVP)

**User Story**:
> "Sarah completes 10 algebra problems (60% correct) and 5 geometry problems (90% correct). The AI assigns 5 more algebra problems and 1 geometry review."

### 4. Multi-Goal Tracking

**Requirement**: Students can pursue multiple learning goals simultaneously, see progress across all.

**Implementation**:
- Goals table: goal_type (SAT_Math, AP_Chemistry), status (active, completed), threshold (0.75)
- Track practice attempts per goal
- Calculate progress: (correct_attempts / total_attempts) per goal
- Dashboard displays all active goals with progress bars

**User Story**:
> "Sarah is preparing for SAT Math (65% progress) and AP Chemistry (40% progress). Dashboard shows both, recommends more chemistry practice."

### 5. Retention Triggers

**Requirement**: Automatically suggest related subjects when goals complete, nudge inactive students.

**5a. Goal Completion Suggestions**

**Trigger**: When goal reaches completion threshold (e.g., 75% accuracy on 20+ problems)

**Action**: Surface related subject recommendations
- SAT Complete → College Essays, Study Skills, AP Prep
- Chemistry → Physics, Biology, STEM subjects
- Algebra → Geometry, Pre-Calculus

**Implementation**: Hardcoded mapping table for MVP

**User Story**:
> "Sarah completes SAT Math goal. Dashboard shows: 'Great job! Students who ace SAT often need help with: College Essays (80% take this), SAT Verbal (65%), AP Courses (55%).'"

**5b. Inactivity Nudges**

**Trigger**: Student has <3 sessions by Day 7 after signup

**Action**: Dashboard banner + in-app notification
- "You're off to a great start! Book your next session to keep momentum."
- Link to mock booking system

**Implementation**: Check session count on dashboard load

**User Story**:
> "Sarah signed up 6 days ago, completed 2 sessions. She logs in and sees a prominent nudge to book session #3."

**5c. Struggling Student Flags**

**Trigger**: Student gets same problem category wrong 3+ times in a row

**Action**:
1. Flag for primary tutor review (mock notification)
2. Check online tutor availability (mock API)
3. Suggest booking immediate help if available

**User Story**:
> "Sarah fails 4 stoichiometry problems in a row. System flags Mr. Rodriguez and displays: 'Struggling with this concept? An online tutor is available now [Book Session]'."

## Technical Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Supabase (Postgres + pgvector extension)
- **AI**: OpenAI API
  - Embeddings: `text-embedding-3-small` (~$0.02 per 1M tokens)
  - Chat: `gpt-4o-mini` (~$0.15 per 1M input tokens)
- **Hosting**: Vercel (free tier: 100GB bandwidth, serverless functions)
- **Auth**: Mock system (simulate existing auth, store sessions in Supabase)

### System Architecture

```
┌─────────────┐
│   Student   │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│      Next.js App (Vercel)       │
│  ┌───────────────────────────┐  │
│  │  Frontend (React)         │  │
│  │  - Dashboard              │  │
│  │  - Chat Interface         │  │
│  │  - Practice Mode          │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  API Routes               │  │
│  │  - /api/chat              │  │
│  │  - /api/practice          │  │
│  │  - /api/sessions          │  │
│  │  - /api/embeddings        │  │
│  │  - /api/mock/*            │  │
│  └───────────────────────────┘  │
└────────┬────────────────┬───────┘
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────┐
│  Supabase       │  │  OpenAI API  │
│  - Postgres     │  │  - Embeddings│
│  - pgvector     │  │  - Chat      │
│  - Auth (mock)  │  │              │
└─────────────────┘  └──────────────┘
```

### Data Flow: Session Ingestion → RAG → Chat

```
1. Tutor Session Occurs
   ↓
2. POST /api/sessions/ingest
   { student_id, transcript, date }
   ↓
3. Chunk transcript (500 tokens each)
   ↓
4. Generate embeddings (OpenAI)
   ↓
5. Store in session_embeddings table
   ↓
6. Student asks question via chat
   ↓
7. Embed question, search pgvector
   ↓
8. Retrieve top 3 relevant chunks
   ↓
9. Pass to gpt-4o-mini with context
   ↓
10. Stream response to student
```

## Database Schema

### Core Tables

```sql
-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  signup_date TIMESTAMP DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,
  primary_tutor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tutoring Sessions
CREATE TABLE tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  session_date TIMESTAMP NOT NULL,
  transcript TEXT NOT NULL,
  duration_minutes INTEGER,
  tutor_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Session Embeddings (Vector Store)
CREATE TABLE session_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536), -- text-embedding-3-small dimension
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity search index
CREATE INDEX ON session_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Goals
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

-- Practice Attempts
CREATE TABLE practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL, -- Reference to mock problem bank
  category TEXT NOT NULL, -- SAT_Math_Algebra, etc.
  correct BOOLEAN NOT NULL,
  student_answer TEXT,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tutor Flags (for struggling students)
CREATE TABLE tutor_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  tutor_id UUID,
  flag_type TEXT NOT NULL, -- struggling, inactive, at_risk
  category TEXT, -- Problem category if applicable
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Indexes for Performance

```sql
-- Frequently queried fields
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_sessions_student ON tutoring_sessions(student_id, session_date DESC);
CREATE INDEX idx_embeddings_student ON session_embeddings(student_id);
CREATE INDEX idx_goals_student ON goals(student_id, status);
CREATE INDEX idx_attempts_student_goal ON practice_attempts(student_id, goal_id, created_at DESC);
CREATE INDEX idx_attempts_category ON practice_attempts(student_id, category, created_at DESC);
CREATE INDEX idx_chat_student ON chat_messages(student_id, created_at DESC);
CREATE INDEX idx_flags_unresolved ON tutor_flags(student_id, resolved) WHERE resolved = FALSE;
```

## API Specifications

### Authentication (Mock)

**POST /api/auth/login**
```json
Request:
{
  "email": "sarah@example.com",
  "password": "mock123"
}

Response:
{
  "success": true,
  "student": {
    "id": "uuid",
    "email": "sarah@example.com",
    "name": "Sarah Johnson"
  },
  "token": "mock-jwt-token"
}
```

**POST /api/auth/logout**
```json
Response:
{ "success": true }
```

### Session Ingestion

**POST /api/sessions/ingest**
```json
Request:
{
  "student_id": "uuid",
  "transcript": "Full transcript text...",
  "session_date": "2025-01-15T14:30:00Z",
  "duration_minutes": 60,
  "tutor_id": "uuid"
}

Response:
{
  "success": true,
  "session_id": "uuid",
  "chunks_created": 12
}
```

### Chat

**POST /api/chat**
```json
Request:
{
  "student_id": "uuid",
  "message": "What did we cover about quadratics?"
}

Response (streaming):
{
  "response": "In your session on Feb 10, you worked on...",
  "retrieved_chunks": [
    {
      "session_date": "2025-02-10",
      "text": "Let's solve this quadratic: x² + 5x + 6 = 0..."
    }
  ]
}
```

**GET /api/chat/history?student_id=uuid&limit=50**
```json
Response:
{
  "messages": [
    {
      "role": "user",
      "content": "What did we cover?",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "In your last session...",
      "created_at": "2025-01-15T10:00:05Z"
    }
  ]
}
```

### Practice Problems

**GET /api/practice/problems?goal_id=uuid&count=5**
```json
Response:
{
  "problems": [
    {
      "id": "sat_math_001",
      "category": "SAT_Math_Algebra",
      "difficulty": "medium",
      "question": "If 3x + 7 = 22, what is x?",
      "options": ["3", "5", "7", "9"],
      "correct_answer": "5"
    }
  ]
}
```

**POST /api/practice/submit**
```json
Request:
{
  "student_id": "uuid",
  "goal_id": "uuid",
  "problem_id": "sat_math_001",
  "category": "SAT_Math_Algebra",
  "answer": "5",
  "time_spent_seconds": 45
}

Response:
{
  "correct": true,
  "explanation": "Correct! Subtracting 7 from both sides: 3x = 15, so x = 5.",
  "updated_accuracy": 0.78,
  "next_recommendation": "Great job! Try 3 more algebra problems to solidify this."
}
```

### Goals

**GET /api/goals?student_id=uuid**
```json
Response:
{
  "goals": [
    {
      "id": "uuid",
      "goal_type": "SAT_Math",
      "status": "active",
      "current_accuracy": 0.65,
      "target_accuracy": 0.75,
      "problems_completed": 23,
      "created_at": "2025-01-10T00:00:00Z"
    }
  ]
}
```

**POST /api/goals**
```json
Request:
{
  "student_id": "uuid",
  "goal_type": "AP_Chemistry",
  "target_accuracy": 0.75
}

Response:
{
  "success": true,
  "goal": { /* goal object */ }
}
```

**POST /api/goals/:id/complete**
```json
Response:
{
  "success": true,
  "recommendations": [
    {
      "goal_type": "AP_Physics",
      "reason": "80% of students who complete Chemistry take Physics",
      "conversion_rate": 0.80
    }
  ]
}
```

### Retention & Flags

**GET /api/retention/check?student_id=uuid**
```json
Response:
{
  "needs_nudge": true,
  "reason": "session_count_low",
  "session_count": 2,
  "days_since_signup": 6,
  "message": "You're off to a great start! Book your next session to keep momentum."
}
```

**POST /api/flags/create**
```json
Request:
{
  "student_id": "uuid",
  "flag_type": "struggling",
  "category": "SAT_Math_Geometry",
  "message": "Failed 4 consecutive geometry problems"
}

Response:
{
  "success": true,
  "tutor_notified": true,
  "online_tutor_available": false
}
```

### Mock APIs

**GET /api/mock/problems/:category**
Returns random problems from local JSON bank

**GET /api/mock/tutor-availability**
```json
Response:
{
  "available": true, // Random for demo
  "next_available_slot": "2025-01-15T16:00:00Z"
}
```

**POST /api/mock/notify-tutor**
Logs to console, returns success (simulates email/SMS)

## AI Implementation Details

### RAG (Retrieval-Augmented Generation)

**Embedding Pipeline**:
1. Receive transcript (POST /api/sessions/ingest)
2. Split into chunks (500 tokens, 50 token overlap)
3. For each chunk:
   - Call OpenAI `text-embedding-3-small`
   - Store: session_id, student_id, chunk_text, embedding (1536-dim vector)
4. Index with pgvector for cosine similarity search

**Retrieval Pipeline**:
1. Student asks question
2. Embed question using same model
3. Query: `SELECT chunk_text, session_date FROM session_embeddings WHERE student_id = ? ORDER BY embedding <=> query_embedding LIMIT 3`
4. Return top 3 most similar chunks

**Chat Completion**:
```javascript
const systemPrompt = `You are a helpful AI study companion. You have access to the student's previous tutoring sessions. Use this context to provide accurate, helpful answers. If a question is too complex, encourage the student to book a session with their tutor.

Retrieved session context:
${chunks.map(c => `[${c.session_date}]: ${c.text}`).join('\n\n')}`;

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: studentMessage }
  ],
  temperature: 0.7,
  stream: true
});
```

### Adaptive Practice Logic

**Simple Category-Based Adaptation**:

```javascript
// Calculate accuracy per category
const categoryStats = await db
  .select('category', 'SUM(correct::int) as correct', 'COUNT(*) as total')
  .from('practice_attempts')
  .where({ student_id, goal_id })
  .groupBy('category');

// Find weak categories (< 75% accuracy)
const weakCategories = categoryStats
  .filter(c => c.correct / c.total < 0.75)
  .map(c => c.category);

// Fetch problems, weighted toward weak categories
// 70% from weak categories, 30% from all categories
const problems = [
  ...fetchProblems(weakCategories, count * 0.7),
  ...fetchProblems(allCategories, count * 0.3)
];
```

**No spaced repetition, difficulty progression, or prerequisite tracking in MVP.**

## Non-Functional Requirements

### Performance
- Chat response latency: <3 seconds (including RAG retrieval)
- Practice problem load: <1 second
- Dashboard load: <2 seconds
- Embedding ingestion: <30 seconds per 1-hour transcript

### Scalability
- Support 100 concurrent users (Vercel free tier limit)
- Store up to 500MB data (Supabase free tier)
- Handle 500 chat messages/day

### Security
- Mock auth only (not production-ready)
- Store OpenAI key in environment variables
- Use Supabase RLS (Row Level Security) policies per student
- No sensitive PII beyond email/name

### Cost (Monthly Estimates)
- Vercel: $0 (free tier)
- Supabase: $0 (free tier)
- OpenAI:
  - Embeddings: ~$0.50 for 25M tokens (~50 hours of transcripts)
  - Chat: ~$1.50 for 10M input tokens (~20k messages)
- **Total: ~$2-5/month for MVP testing**

## Out of Scope (v1)

- Real authentication system (use mock)
- Actual tutor booking integration (mock API)
- Email/SMS notifications (flag only, no send)
- Cross-student learning (RAG scoped per-student)
- Spaced repetition algorithms
- Difficulty progression
- Mobile app (web only)
- Admin dashboard for tutors
- Payment processing
- Analytics dashboard (basic only)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenAI API costs exceed budget | High | Monitor usage, implement rate limiting, cache embeddings |
| Poor RAG retrieval quality | High | Tune chunk size (500 tokens), experiment with top-k (3-5), improve chunking strategy |
| Students don't engage with practice | Medium | Make problems fun, add streaks/badges, A/B test UI |
| Supabase free tier limits hit | Medium | Optimize queries, monitor usage, upgrade if needed ($25/mo) |
| Goal completion logic too simple | Low | Acceptable for MVP, iterate based on feedback |

## Future Enhancements (v2+)

1. **Cross-Student Learning**: Enable RAG across anonymized student data to surface common patterns
2. **Spaced Repetition**: Implement SRS algorithm for long-term retention
3. **Voice Interface**: Voice-to-text for chat, especially helpful for younger students
4. **Tutor Dashboard**: Show flagged students, AI suggestions, intervention history
5. **Real Integrations**: Connect to actual scheduling, CRM, video platforms
6. **Mobile App**: React Native version for iOS/Android
7. **Gamification**: Streaks, leaderboards, badges for engagement
8. **Parent Portal**: Progress reports, session summaries
9. **Advanced Analytics**: Retention cohorts, A/B testing, revenue attribution

## Implementation Roadmap

See individual phase documents for detailed implementation:

- **Phase 1**: Foundation (Next.js, Supabase, auth, schema) - 2 days
- **Phase 2**: Transcript ingestion + Vector RAG - 2 days
- **Phase 3**: AI Chat interface - 2 days
- **Phase 4**: Practice mode + adaptive logic - 2 days
- **Phase 5**: Goals tracking + retention triggers - 2 days
- **Phase 6**: Dashboard UI - 2 days
- **Phase 7**: Mock data + deployment - 2 days

**Total: ~2 weeks (14 days)**
