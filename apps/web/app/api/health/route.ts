import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(
      { ...data, api_url: API_URL },
      { headers: { 'Cache-Control': 'public, max-age=10, stale-while-revalidate=30' } },
    );
  } catch {
    return NextResponse.json({ status: 'error', message: 'API unreachable', api_url: API_URL }, { status: 503 });
  }
}
