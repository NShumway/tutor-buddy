# Phase 3: AI Chat Interface

**Goal**: Build a conversational AI interface that uses RAG to provide context-aware responses based on past tutoring sessions.

**Duration**: ~2 days

## Requirements

1. Create chat message storage and retrieval functions
2. Build AI chat service that:
   - Retrieves relevant context via RAG
   - Maintains conversation history
   - Generates responses using gpt-4o-mini
   - Encourages booking tutors for complex questions
3. Create streaming chat API endpoint
4. Build chat UI component with message history
5. Integrate chat into student dashboard

## Database Schema

Already created in Phase 1, relevant table:

```sql
-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_student ON chat_messages(student_id, created_at DESC);
```

## API Endpoints

### POST /api/chat

Sends a message and receives AI response (streaming).

**Request:**
```json
{
  "student_id": "uuid",
  "message": "Can you explain the quadratic formula again?"
}
```

**Response (Server-Sent Events stream):**
```
data: {"type":"token","content":"In"}
data: {"type":"token","content":" your"}
data: {"type":"token","content":" session"}
...
data: {"type":"done","message_id":"uuid"}
```

### GET /api/chat/history

Retrieves chat history for a student.

**Query params:**
- `student_id`: UUID
- `limit`: number (default 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What did we cover?",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "In your last session...",
      "created_at": "2025-01-15T10:00:05Z"
    }
  ]
}
```

## Frontend Components

### ChatInterface Component

**components/ChatInterface.tsx**
- Message list (scrollable)
- User input textarea
- Send button
- Loading indicator during streaming
- Auto-scroll to latest message

### ChatMessage Component

**components/ChatMessage.tsx**
- Displays single message (user or assistant)
- Different styling for user vs assistant
- Timestamp display

## Implementation Steps

### 1. Create Chat Service Utility

**lib/chat.ts**
```typescript
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
```

### 2. Create Chat API Endpoint (Streaming)

**app/api/chat/route.ts**
```typescript
import { NextRequest } from 'next/server';
import {
  saveChatMessage,
  buildChatContext,
  generateChatStream,
} from '@/lib/chat';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { student_id, message } = await request.json();

    if (!student_id || !message) {
      return new Response('Missing student_id or message', { status: 400 });
    }

    // Save user message
    await saveChatMessage(student_id, 'user', message);

    // Build context (RAG + history)
    const context = await buildChatContext(student_id, message);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Stream AI response
          for await (const chunk of generateChatStream(context, message)) {
            fullResponse += chunk;

            // Send chunk to client
            const data = JSON.stringify({ type: 'token', content: chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Save assistant message
          const messageId = await saveChatMessage(
            student_id,
            'assistant',
            fullResponse
          );

          // Send done signal
          const doneData = JSON.stringify({ type: 'done', message_id: messageId });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

          controller.close();
        } catch (error: any) {
          console.error('Stream error:', error);
          const errorData = JSON.stringify({ type: 'error', message: error.message });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return new Response(error.message, { status: 500 });
  }
}
```

### 3. Create Chat History API

**app/api/chat/history/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/chat';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const student_id = searchParams.get('student_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!student_id) {
    return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
  }

  try {
    const messages = await getChatHistory(student_id, limit);
    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('History error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 4. Create Chat Message Component

**components/ChatMessage.tsx**
```typescript
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {new Date(message.created_at).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
```

### 5. Create Chat Interface Component

**components/ChatInterface.tsx**
```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatInterfaceProps {
  student_id: string;
}

export default function ChatInterface({ student_id }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    loadHistory();
  }, [student_id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  async function loadHistory() {
    try {
      const res = await fetch(`/api/chat/history?student_id=${student_id}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setStreamingMessage('');

    // Add user message to UI immediately
    const tempUserMessage: ChatMessageType = {
      id: 'temp',
      student_id,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id, message: userMessage }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token') {
              fullResponse += data.content;
              setStreamingMessage(fullResponse);
            } else if (data.type === 'done') {
              // Add assistant message to history
              const assistantMessage: ChatMessageType = {
                id: data.message_id,
                student_id,
                role: 'assistant',
                content: fullResponse,
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              setStreamingMessage('');
            } else if (data.type === 'error') {
              console.error('Stream error:', data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-200 text-gray-900">
              <p className="whitespace-pre-wrap">{streamingMessage}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask a question about your lessons..."
            className="flex-1 px-3 py-2 border rounded-lg resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Create Chat Page

**app/chat/page.tsx**
```typescript
import { getCurrentStudent } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default async function ChatPage() {
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
            <a href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </a>
            <span className="text-gray-700">{student.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Chat with Your AI Companion</h2>
        <p className="text-gray-600 mb-6">
          Ask questions about your lessons, request practice problems, or get help understanding concepts.
        </p>

        <ChatInterface student_id={student.id} />
      </main>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] POST /api/chat streams AI responses correctly
- [ ] Chat messages are saved to database (both user and assistant)
- [ ] RAG retrieves relevant context from past sessions
- [ ] System prompt includes retrieved chunks
- [ ] Conversation history is maintained (last 10 messages)
- [ ] Chat UI displays messages with proper styling
- [ ] Streaming responses appear token-by-token
- [ ] Auto-scroll works as messages arrive
- [ ] Enter key sends message, Shift+Enter adds newline
- [ ] Chat history persists across page reloads
- [ ] AI encourages booking tutors for complex questions

## Testing

```bash
# 1. Ensure you have ingested at least one transcript (Phase 2)

# 2. Visit http://localhost:3000/chat

# 3. Test questions:
# - "What did we cover in my last session?"
# - "Can you explain quadratic equations?"
# - "I'm struggling with identifying coefficients"

# 4. Verify:
# - Responses reference session content when relevant
# - Streaming works smoothly
# - Messages persist after page reload
# - Conversation context is maintained

# 5. Check database:
# - chat_messages table has both user and assistant messages
# - created_at timestamps are correct
```

## Next Phase

Phase 4 will implement the practice mode with adaptive problem selection based on student performance.
