import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cronAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = request.headers.get('x-cron-secret');
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return headerSecret === expected || bearer === expected;
}

async function runSentinel() {
  const secret = process.env.CRON_SECRET!;
  const res = await fetch(`${API_URL}/admin/cron/sentinel`, {
    method: 'POST',
    headers: { 'x-cron-secret': secret },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await runSentinel();
  } catch {
    return NextResponse.json({ error: 'Sentinel failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
