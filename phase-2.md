# Phase 2: Transcript Ingestion + Vector RAG

**Goal**: Build the pipeline to ingest tutoring session transcripts, chunk them, generate embeddings, and store in pgvector for semantic search (RAG).

**Duration**: ~2 days

## Requirements

1. Create OpenAI client utility for embeddings
2. Implement transcript chunking logic (500 tokens per chunk, 50 token overlap)
3. Build embedding generation service
4. Create API endpoint to ingest transcripts and generate embeddings
5. Implement semantic search function (retrieve relevant chunks by similarity)
6. Create admin endpoint to manually trigger transcript ingestion (for testing)

## Database Schema

Already created in Phase 1, but relevant tables for this phase:

```sql
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

-- Session embeddings
CREATE TABLE session_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),
  chunk_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON session_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_embeddings_student ON session_embeddings(student_id);
```

## API Endpoints

### POST /api/sessions/ingest

Ingests a tutoring session transcript, chunks it, generates embeddings, and stores them.

**Request:**
```json
{
  "student_id": "uuid",
  "transcript": "Full transcript text here...",
  "session_date": "2025-01-15T14:30:00Z",
  "duration_minutes": 60,
  "tutor_id": "uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "chunks_created": 12,
  "embeddings_generated": 12
}
```

### POST /api/embeddings/search

Performs semantic search to find relevant transcript chunks.

**Request:**
```json
{
  "student_id": "uuid",
  "query": "What did we cover about quadratic equations?",
  "top_k": 3
}
```

**Response:**
```json
{
  "chunks": [
    {
      "chunk_text": "Let's work on quadratic equations. Remember the formula...",
      "session_id": "uuid",
      "session_date": "2025-01-15T14:30:00Z",
      "similarity_score": 0.87
    }
  ]
}
```

## Implementation Steps

### 1. Create OpenAI Client Utility

**lib/openai.ts**
```typescript
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// Generate embeddings for multiple texts (batch)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map((d) => d.embedding);
}
```

### 2. Create Transcript Chunking Utility

**lib/chunking.ts**
```typescript
import { encode } from 'gpt-tokenizer'; // npm install gpt-tokenizer

export interface TextChunk {
  text: string;
  index: number;
  token_count: number;
}

/**
 * Splits text into chunks of approximately chunkSize tokens
 * with overlapSize tokens overlapping between chunks.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlapSize: number = 50
): TextChunk[] {
  // Split into sentences (simple approach)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const chunks: TextChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = encode(sentence).length;

    // If adding this sentence exceeds chunk size, save current chunk
    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ').trim();
      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        token_count: currentTokenCount,
      });

      // Keep last few sentences for overlap
      const overlapSentences: string[] = [];
      let overlapTokens = 0;
      for (let i = currentChunk.length - 1; i >= 0; i--) {
        const tokens = encode(currentChunk[i]).length;
        if (overlapTokens + tokens <= overlapSize) {
          overlapSentences.unshift(currentChunk[i]);
          overlapTokens += tokens;
        } else {
          break;
        }
      }

      currentChunk = overlapSentences;
      currentTokenCount = overlapTokens;
    }

    currentChunk.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.join(' ').trim(),
      index: chunkIndex,
      token_count: currentTokenCount,
    });
  }

  return chunks;
}
```

### 3. Create Embeddings Service

**lib/embeddings.ts**
```typescript
import { supabaseAdmin } from './supabase';
import { generateEmbeddings } from './openai';
import { chunkText, TextChunk } from './chunking';

export interface IngestTranscriptParams {
  student_id: string;
  transcript: string;
  session_date: string;
  duration_minutes?: number;
  tutor_id?: string;
}

export interface IngestResult {
  session_id: string;
  chunks_created: number;
  embeddings_generated: number;
}

/**
 * Ingests a transcript: creates session, chunks text, generates embeddings, stores in DB
 */
export async function ingestTranscript(
  params: IngestTranscriptParams
): Promise<IngestResult> {
  const { student_id, transcript, session_date, duration_minutes, tutor_id } = params;

  // 1. Create tutoring session record
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('tutoring_sessions')
    .insert({
      student_id,
      transcript,
      session_date,
      duration_minutes,
      tutor_id,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to create session: ${sessionError?.message}`);
  }

  // 2. Chunk the transcript
  const chunks = chunkText(transcript, 500, 50);

  if (chunks.length === 0) {
    return {
      session_id: session.id,
      chunks_created: 0,
      embeddings_generated: 0,
    };
  }

  // 3. Generate embeddings for all chunks (batch)
  const embeddings = await generateEmbeddings(chunks.map((c) => c.text));

  // 4. Store embeddings in database
  const embeddingRecords = chunks.map((chunk, idx) => ({
    session_id: session.id,
    student_id,
    chunk_text: chunk.text,
    embedding: JSON.stringify(embeddings[idx]), // Supabase expects array as JSON string
    chunk_index: chunk.index,
  }));

  const { error: embeddingError } = await supabaseAdmin
    .from('session_embeddings')
    .insert(embeddingRecords);

  if (embeddingError) {
    throw new Error(`Failed to store embeddings: ${embeddingError.message}`);
  }

  // 5. Update student's session count
  await supabaseAdmin.rpc('increment_session_count', { student_uuid: student_id });

  return {
    session_id: session.id,
    chunks_created: chunks.length,
    embeddings_generated: embeddings.length,
  };
}

export interface SearchChunk {
  chunk_text: string;
  session_id: string;
  session_date: string;
  similarity_score: number;
}

/**
 * Searches for relevant transcript chunks using semantic similarity
 */
export async function searchTranscriptChunks(
  student_id: string,
  query: string,
  top_k: number = 3
): Promise<SearchChunk[]> {
  // 1. Generate embedding for query
  const queryEmbedding = await generateEmbeddings([query]);

  // 2. Search for similar chunks using pgvector
  // Note: We use RPC function for vector search
  const { data, error } = await supabaseAdmin.rpc('search_embeddings', {
    query_embedding: JSON.stringify(queryEmbedding[0]),
    match_student_id: student_id,
    match_count: top_k,
  });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return data || [];
}
```

### 4. Create Database RPC Functions

These SQL functions need to be added to Supabase (run in SQL Editor):

```sql
-- Function to increment student session count
CREATE OR REPLACE FUNCTION increment_session_count(student_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE students
  SET session_count = session_count + 1
  WHERE id = student_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to search embeddings by similarity
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding TEXT,
  match_student_id UUID,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  chunk_text TEXT,
  session_id UUID,
  session_date TIMESTAMP,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.chunk_text,
    e.session_id,
    s.session_date,
    1 - (e.embedding <=> query_embedding::vector) AS similarity_score
  FROM session_embeddings e
  JOIN tutoring_sessions s ON e.session_id = s.id
  WHERE e.student_id = match_student_id
  ORDER BY e.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### 5. Create Transcript Ingestion API

**app/api/sessions/ingest/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ingestTranscript } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, transcript, session_date, duration_minutes, tutor_id } = body;

    // Validate required fields
    if (!student_id || !transcript || !session_date) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, transcript, session_date' },
        { status: 400 }
      );
    }

    // Ingest transcript
    const result = await ingestTranscript({
      student_id,
      transcript,
      session_date,
      duration_minutes,
      tutor_id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to ingest transcript' },
      { status: 500 }
    );
  }
}
```

### 6. Create Embedding Search API

**app/api/embeddings/search/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchTranscriptChunks } from '@/lib/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, query, top_k = 3 } = body;

    if (!student_id || !query) {
      return NextResponse.json(
        { error: 'Missing required fields: student_id, query' },
        { status: 400 }
      );
    }

    const chunks = await searchTranscriptChunks(student_id, query, top_k);

    return NextResponse.json({ chunks });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
```

### 7. Create Test Ingestion Page (for development)

**app/admin/ingest/page.tsx**
```typescript
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
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Transcript Ingestion</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Student ID</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="uuid"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full px-3 py-2 border rounded h-64"
            placeholder="Paste transcript here..."
          />
        </div>

        <button
          onClick={handleIngest}
          disabled={loading || !studentId || !transcript}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Ingesting...' : 'Ingest Transcript'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Dependencies to Install

```bash
npm install gpt-tokenizer
```

## Acceptance Criteria

- [ ] OpenAI client utility can generate embeddings
- [ ] Chunking utility splits text into ~500 token chunks with overlap
- [ ] POST /api/sessions/ingest successfully:
  - Creates tutoring_sessions record
  - Chunks transcript
  - Generates embeddings via OpenAI
  - Stores embeddings in session_embeddings table
  - Increments student session count
- [ ] POST /api/embeddings/search returns relevant chunks
- [ ] Vector similarity search works correctly (pgvector)
- [ ] Test page at /admin/ingest allows manual transcript upload
- [ ] Embeddings are scoped per student (no cross-student leakage)

## Testing

```bash
# 1. Get a student ID from Phase 1
# sarah@example.com's UUID

# 2. Visit http://localhost:3000/admin/ingest

# 3. Paste a sample transcript:
Today we covered quadratic equations. The standard form is ax² + bx + c = 0.
We used the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a.
Sarah struggled with identifying the coefficients initially, but after working through
three examples, she got the hang of it. We practiced factoring when possible, and
used the formula when factoring didn't work. Homework: Complete problems 1-10
on page 42, focusing on identifying a, b, and c values first.

# 4. Click "Ingest Transcript"
# Should see: { success: true, session_id: "...", chunks_created: 2, embeddings_generated: 2 }

# 5. Test search via API:
curl -X POST http://localhost:3000/api/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "sarah-uuid-here",
    "query": "quadratic formula",
    "top_k": 2
  }'

# Should return chunks about quadratic formula with high similarity scores
```

## Next Phase

Phase 3 will build the AI chat interface that uses these embeddings for context-aware conversations.
