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
