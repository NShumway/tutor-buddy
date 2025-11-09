# AI Study Companion

An AI-powered study companion that lives between tutoring sessions, remembers previous lessons, assigns adaptive practice, and drives student retention through intelligent engagement.

## Problem Statement

Tutoring companies face a critical retention challenge:
- **52% churn rate** when students complete their initial goal
- Students with **<3 sessions in first week** rarely continue
- No engagement between tutoring sessions
- Single-subject focus misses cross-selling opportunities

## Solution

A persistent AI companion that:
- Remembers every tutoring session via transcript analysis
- Assigns adaptive practice problems based on performance
- Suggests related subjects when goals complete (SAT → College Essays)
- Nudges inactive students to book next session
- Flags struggling students for tutor intervention

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (Postgres + pgvector)
- **AI**: OpenAI API
  - `text-embedding-3-small` for embeddings
  - `gpt-4o-mini` for chat completions
- **Hosting**: Vercel (free tier)

## Prerequisites

- Node.js 18+
- OpenAI API key
- Supabase account (free tier)

## Local Development Setup

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Enable the `pgvector` extension:
     - Go to Database → Extensions
     - Search for "vector" and enable it
   - Run the database migrations (see Phase 1 docs)

3. **Configure environment variables**

Create a `.env.local` file in the root directory:

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

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
tutor-buddy/
├── app/                      # Next.js app router
│   ├── api/                  # API routes
│   │   ├── auth/            # Mock authentication
│   │   ├── chat/            # AI chat endpoint
│   │   ├── embeddings/      # Vector embedding service
│   │   ├── practice/        # Practice problem API
│   │   ├── sessions/        # Transcript ingestion
│   │   └── mock/            # Mock external APIs
│   ├── dashboard/           # Student dashboard
│   ├── practice/            # Practice mode UI
│   └── login/               # Auth pages
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── openai.ts            # OpenAI client
│   ├── embeddings.ts        # RAG utilities
│   └── practice.ts          # Adaptive practice logic
├── components/              # React components
├── types/                   # TypeScript types
└── public/                  # Static assets
```

## Database Schema

See `PRD.md` for complete schema. Core tables:

- `students` - Student profiles
- `tutoring_sessions` - Session transcripts
- `session_embeddings` - Vector embeddings for RAG
- `goals` - Student learning goals (SAT, AP Chem, etc.)
- `practice_attempts` - Problem completion tracking
- `chat_messages` - Conversation history

## Key Features

### 1. Session Memory (RAG)
- Transcripts chunked and embedded using `text-embedding-3-small`
- Semantic search retrieves relevant context for student questions
- Scoped per-student (no cross-student data leakage)

### 2. Adaptive Practice
- Problems tagged by category (e.g., "SAT_Math_Algebra")
- Tracks accuracy per category
- Serves more problems in weak categories
- Mock API provides fresh problems

### 3. Retention Triggers
- **Goal Completion**: Suggests related subjects
  - SAT → College Essays, Study Skills, AP Prep
  - Chemistry → Physics, STEM subjects
- **Inactivity**: Flags students with <3 sessions by Day 7
- **Struggling**: Auto-flags repeated failures for tutor review

### 4. Multi-Goal Tracking
- Students can pursue multiple subjects simultaneously
- Dashboard shows progress across all goals
- Prevents "goal achieved" churn

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard.

## Development Phases

Implementation is broken into 7 phases:

1. **Foundation** - Next.js, Supabase, auth, schema
2. **Transcript Ingestion** - Vector embeddings, RAG pipeline
3. **AI Chat** - Conversational interface with memory
4. **Practice Mode** - Problem delivery, adaptive logic
5. **Goals & Retention** - Tracking, completion triggers
6. **Dashboard UI** - Student-facing interface
7. **Mock Data & Deployment** - Seed data, production deploy

See `phase-*.md` files for detailed implementation specs.

## Success Metrics

- [ ] Working prototype deployed to cloud
- [ ] Functional demo (not just designs)
- [ ] Solves real retention problem (52% churn)
- [ ] Production-ready within 2 weeks
- [ ] Sophisticated AI usage (RAG, adaptive practice)
- [ ] Clear ROI path within 90 days

## License

MIT
