import { NextResponse } from 'next/server';
import { checkTutorAvailability } from '@/lib/retention';

export async function GET() {
  try {
    const availability = await checkTutorAvailability();
    return NextResponse.json(availability);
  } catch (error: any) {
    console.error('Availability error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
