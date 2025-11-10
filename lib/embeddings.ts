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
