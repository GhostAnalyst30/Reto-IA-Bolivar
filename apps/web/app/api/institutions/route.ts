import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/institutions`, { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}
