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
