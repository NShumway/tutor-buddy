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
