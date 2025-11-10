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
    <div className="flex flex-col h-[600px] border border-slate-700 rounded-lg bg-slate-800">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg px-4 py-2 bg-slate-700 text-slate-100">
              <p className="whitespace-pre-wrap">{streamingMessage}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-700 p-4">
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
            className="flex-1 px-3 py-2 border border-slate-600 rounded-lg resize-none bg-slate-700 text-slate-100"
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
