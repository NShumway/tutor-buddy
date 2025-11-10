import { openai } from './openai';
import { supabaseAdmin } from './supabase';
import { searchTranscriptChunks } from './embeddings';
import { ChatMessage } from '@/types';

export interface ChatRequest {
  student_id: string;
  message: string;
}

export interface ChatContext {
  retrieved_chunks: Array<{
    chunk_text: string;
    session_date: string;
  }>;
  conversation_history: ChatMessage[];
}

/**
 * Saves a chat message to the database
 */
export async function saveChatMessage(
  student_id: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({ student_id, role, content })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return data.id;
}

/**
 * Retrieves recent chat history for context
 */
export async function getChatHistory(
  student_id: string,
  limit: number = 10
): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('student_id', student_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get chat history: ${error.message}`);
  }

  // Reverse to get chronological order
  return (data || []).reverse();
}

/**
 * Builds context for AI: RAG chunks + conversation history
 */
export async function buildChatContext(
  student_id: string,
  query: string
): Promise<ChatContext> {
  // 1. Retrieve relevant transcript chunks via RAG
  const chunks = await searchTranscriptChunks(student_id, query, 3);

  // 2. Get recent conversation history
  const history = await getChatHistory(student_id, 10);

  return {
    retrieved_chunks: chunks.map((c) => ({
      chunk_text: c.chunk_text,
      session_date: new Date(c.session_date).toLocaleDateString(),
    })),
    conversation_history: history,
  };
}

/**
 * Generates system prompt with retrieved context
 */
export function buildSystemPrompt(chunks: ChatContext['retrieved_chunks']): string {
  const contextText = chunks.length > 0
    ? chunks
        .map((c) => `[Session on ${c.session_date}]:\n${c.chunk_text}`)
        .join('\n\n')
    : 'No previous session context available yet.';

  return `You are a helpful AI study companion for a student. Your role is to:
- Help students review material from their tutoring sessions
- Answer questions clearly and encouragingly
- Provide practice problems when appropriate
- Encourage students to book a session with their human tutor for complex topics or when they're struggling

You have access to the student's previous tutoring session transcripts for context:

${contextText}

Use this context when relevant, but don't force it. If the student asks about something not covered in their sessions, you can still help with general knowledge. Be supportive and educational.`;
}

/**
 * Generates AI response stream
 */
export async function* generateChatStream(
  context: ChatContext,
  userMessage: string
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = buildSystemPrompt(context.retrieved_chunks);

  // Build messages array with conversation history
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...context.conversation_history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 800,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
